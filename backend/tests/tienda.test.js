import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import {
  obtenerMiTienda,
  actualizarMiTienda,
  firmarSubidaCloudinary,
} from '../modules/Tienda/TiendaController.js';
import { firmaDeSubida, cloudinaryConfigurado } from '../services/CloudinaryService.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const crearTienda = (slug) =>
  Tienda.create({ nombre: `Tienda ${slug}`, slug, estado: 'activa', whatsapp: '5491122334455' });

test('obtenerMiTienda devuelve la tienda del usuario', async () => {
  const tienda = await crearTienda('mi-tienda');
  const res = await runHandler(obtenerMiTienda, { tienda });

  assert.equal(res.status, 200);
  assert.equal(res.body.slug, 'mi-tienda');
});

test('actualizarMiTienda cambia datos, tema y pago', async () => {
  const tienda = await crearTienda('personalizar');

  const res = await runHandler(actualizarMiTienda, {
    tienda,
    body: {
      nombre: 'Ropa Linda',
      whatsapp: '5491199887766',
      modoVenta: 'catalogo',
      tema: {
        colorPrimario: '#FF5500',
        tipografia: 'Poppins',
        logo: 'https://res.cloudinary.com/demo/logo.png',
        redes: { instagram: '@ropalinda' },
      },
      pago: { alias: 'ropa.linda.mp', titular: 'Ana Pérez' },
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.nombre, 'Ropa Linda');
  assert.equal(res.body.modoVenta, 'catalogo');

  const actualizada = await Tienda.findById(tienda._id);
  assert.equal(actualizada.tema.colorPrimario, '#FF5500');
  assert.equal(actualizada.tema.tipografia, 'Poppins');
  assert.equal(actualizada.tema.redes.instagram, '@ropalinda');
  assert.equal(actualizada.pago.alias, 'ropa.linda.mp');
  assert.equal(actualizada.pago.titular, 'Ana Pérez');
  assert.equal(actualizada.whatsapp, '5491199887766');
});

test('actualizarMiTienda no pisa los campos que no se envían', async () => {
  const tienda = await crearTienda('merge-tema');
  tienda.tema = { colorPrimario: '#111111', colorSecundario: '#222222', redes: { facebook: 'fb' } };
  await tienda.save();

  await runHandler(actualizarMiTienda, {
    tienda,
    body: { tema: { colorPrimario: '#333333' } },
  });

  const actualizada = await Tienda.findById(tienda._id);
  assert.equal(actualizada.tema.colorPrimario, '#333333');
  assert.equal(actualizada.tema.colorSecundario, '#222222');
  assert.equal(actualizada.tema.redes.facebook, 'fb');
});

test('actualizarMiTienda rechaza colores inválidos', async () => {
  const tienda = await crearTienda('color-malo');

  await assert.rejects(
    runHandler(actualizarMiTienda, { tienda, body: { tema: { colorPrimario: 'rojo' } } })
  );

  const actualizada = await Tienda.findById(tienda._id);
  assert.equal(actualizada.tema.colorPrimario, '#111827');
});

test('la firma de Cloudinary devuelve 503 si no está configurada', async () => {
  const tienda = await crearTienda('sin-cloudinary');
  const res = await runHandler(firmarSubidaCloudinary, { tienda });

  assert.equal(res.status, 503);
  assert.equal(res.body.codigo, 'CLOUDINARY_NO_CONFIGURADO');
});

test('la firma de Cloudinary usa la carpeta de la tienda', async () => {
  const original = {
    name: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  };
  process.env.CLOUDINARY_CLOUD_NAME = 'nexus-demo';
  process.env.CLOUDINARY_API_KEY = '123456789';
  process.env.CLOUDINARY_API_SECRET = 'secreto-de-prueba';

  try {
    assert.equal(cloudinaryConfigurado(), true);
    const tienda = await crearTienda('firma-cloud');
    const res = await runHandler(firmarSubidaCloudinary, { tienda });

    assert.equal(res.status, 200);
    assert.equal(res.body.cloudName, 'nexus-demo');
    assert.equal(res.body.folder, 'nexus/firma-cloud');
    assert.equal(res.body.apiKey, '123456789');
    assert.ok(Number.isInteger(res.body.timestamp));

    const esperada = firmaDeSubida({ carpeta: 'nexus/firma-cloud', timestamp: res.body.timestamp });
    assert.equal(res.body.signature, esperada);
  } finally {
    if (original.name === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = original.name;
    if (original.key === undefined) delete process.env.CLOUDINARY_API_KEY;
    else process.env.CLOUDINARY_API_KEY = original.key;
    if (original.secret === undefined) delete process.env.CLOUDINARY_API_SECRET;
    else process.env.CLOUDINARY_API_SECRET = original.secret;
  }
});
