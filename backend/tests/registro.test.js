import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Usuario from '../modules/Autenticacion/UsuarioModel.js';
import { registrarTienda, consultarSlug, limiteTiendas } from '../modules/Tienda/TiendaController.js';
import { registroTiendaSchema } from '../modules/Tienda/TiendaSchema.js';
import { iniciarSesion } from '../modules/Autenticacion/AutenticacionController.js';
import { verificarCaptcha, captchaConfigurado } from '../services/CaptchaService.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const datosRegistro = (extra = {}) => ({
  nombreComercio: 'Tienda Nueva',
  slug: 'tienda-nueva',
  whatsapp: '5491122334455',
  telefono: '1144556677',
  email: 'dueno@tienda.com',
  clave: 'secreto123',
  pais: 'AR',
  aceptaTerminos: true,
  captchaToken: 'token-de-prueba',
  ...extra,
});

test('el registro crea la tienda en trial con vencimiento a 7 dias', async () => {
  const res = await runHandler(registrarTienda, { body: datosRegistro() });

  assert.equal(res.status, 201);
  assert.equal(res.body.tienda.estado, 'trial');
  assert.equal(res.body.tienda.slug, 'tienda-nueva');
  assert.ok(res.body.token);

  const tienda = await Tienda.findOne({ slug: 'tienda-nueva' });
  const dias = (tienda.fechaVencimiento.getTime() - tienda.fechaInicio.getTime()) / 86400000;
  assert.equal(Math.round(dias), 7);
});

test('el registro crea el administrador asociado a la tienda', async () => {
  await runHandler(registrarTienda, { body: datosRegistro() });

  const tienda = await Tienda.findOne({ slug: 'tienda-nueva' });
  const admin = await Usuario.findOne({ email: 'dueno@tienda.com' });

  assert.equal(admin.rol, 'admin');
  assert.equal(String(admin.tienda), String(tienda._id));
  assert.equal(String(tienda.dueno), String(admin._id));
});

test('no se puede registrar un slug ya usado', async () => {
  await runHandler(registrarTienda, { body: datosRegistro() });

  const repetido = await runHandler(registrarTienda, {
    body: datosRegistro({ email: 'otro@tienda.com' }),
  });

  assert.equal(repetido.status, 409);
  assert.equal(repetido.body.codigo, 'SLUG_EN_USO');
  assert.equal(await Tienda.countDocuments(), 1);
});

test('no se puede registrar un email ya usado', async () => {
  await runHandler(registrarTienda, { body: datosRegistro() });

  const repetido = await runHandler(registrarTienda, {
    body: datosRegistro({ slug: 'otra-tienda' }),
  });

  assert.equal(repetido.status, 409);
  assert.equal(repetido.body.codigo, 'EMAIL_EN_USO');
  assert.equal(await Tienda.countDocuments(), 1);
});

test('el registro respeta el cupo de tiendas', async () => {
  const original = process.env.LIMITE_TIENDAS;
  process.env.LIMITE_TIENDAS = '1';
  try {
    await Tienda.create({ nombre: 'Existente', slug: 'existente', estado: 'activa' });

    const res = await runHandler(registrarTienda, { body: datosRegistro() });

    assert.equal(res.status, 403);
    assert.equal(res.body.codigo, 'CUPO_COMPLETO');
    assert.equal(await Tienda.countDocuments(), 1);
  } finally {
    process.env.LIMITE_TIENDAS = original;
  }
});

test('el limite de tiendas por defecto es 20', () => {
  const original = process.env.LIMITE_TIENDAS;
  delete process.env.LIMITE_TIENDAS;
  try {
    assert.equal(limiteTiendas(), 20);
  } finally {
    if (original === undefined) delete process.env.LIMITE_TIENDAS;
    else process.env.LIMITE_TIENDAS = original;
  }
});

test('la disponibilidad de slug informa si esta libre', async () => {
  await Tienda.create({ nombre: 'Ocupada', slug: 'ocupada', estado: 'activa' });

  const libre = await runHandler(consultarSlug, { params: { slug: 'libre' } });
  const usada = await runHandler(consultarSlug, { params: { slug: 'ocupada' } });

  assert.equal(libre.status, 200);
  assert.equal(libre.body.disponible, true);
  assert.equal(usada.body.disponible, false);
});

test('despues del registro se puede iniciar sesion y el token trae la tienda', async () => {
  await runHandler(registrarTienda, { body: datosRegistro() });

  const login = await runHandler(iniciarSesion, {
    body: { email: 'dueno@tienda.com', clave: 'secreto123' },
  });

  assert.equal(login.status, 200);
  assert.equal(login.body.rol, 'admin');
  assert.ok(login.body.tienda);
});

test('el schema de registro valida slug reservado, email, pais, clave y terminos', () => {
  assert.equal(registroTiendaSchema.safeParse(datosRegistro({ slug: 'admin' })).success, false);
  assert.equal(registroTiendaSchema.safeParse(datosRegistro({ email: 'no-es-email' })).success, false);
  assert.equal(registroTiendaSchema.safeParse(datosRegistro({ pais: 'CL' })).success, false);
  assert.equal(registroTiendaSchema.safeParse(datosRegistro({ clave: 'corta' })).success, false);
  assert.equal(registroTiendaSchema.safeParse(datosRegistro({ aceptaTerminos: false })).success, false);
  assert.equal(registroTiendaSchema.safeParse(datosRegistro()).success, true);
});

test('el captcha se omite cuando no esta configurado', async () => {
  assert.equal(captchaConfigurado(), false);
  const resultado = await verificarCaptcha('token', '127.0.0.1');
  assert.equal(resultado.ok, true);
  assert.equal(resultado.omitido, true);
});
