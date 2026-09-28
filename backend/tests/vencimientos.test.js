import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import { pausarVencidas } from '../services/VencimientosService.js';
import { ejecutarPausaVencidas } from '../modules/Tienda/TiendaController.js';
import { requiereCron } from '../middlewares/CronMiddleware.js';
import { resolverTienda } from '../middlewares/TenantMiddleware.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const haceDias = (dias) => new Date(Date.now() - dias * 86400000);
const enDias = (dias) => new Date(Date.now() + dias * 86400000);

const ejecutarMiddleware = async (middleware, req) => {
  let statusCode = 200;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  let siguiente = false;
  await middleware(req, res, (error) => {
    if (error) throw error;
    siguiente = true;
  });
  return { status: statusCode, body: payload, siguiente };
};

test('estaVigente: pausada es falsa, sin vencimiento es verdadera', async () => {
  const pausada = new Tienda({ nombre: 'P', slug: 'pausada-test', estado: 'pausada' });
  assert.equal(pausada.estaVigente(), false);

  const sinVencimiento = new Tienda({ nombre: 'S', slug: 'sin-vencimiento', estado: 'activa' });
  assert.equal(sinVencimiento.estaVigente(), true);
});

test('estaVigente: depende de la fecha de vencimiento', async () => {
  const vencida = new Tienda({ nombre: 'V', slug: 'vencida-test', estado: 'trial', fechaVencimiento: haceDias(1) });
  const vigente = new Tienda({ nombre: 'F', slug: 'vigente-test', estado: 'trial', fechaVencimiento: enDias(3) });

  assert.equal(vencida.estaVigente(), false);
  assert.equal(vigente.estaVigente(), true);
});

test('pausarVencidas pausa trials y activas vencidas, sin tocar las vigentes', async () => {
  await Tienda.create({ nombre: 'Trial vencida', slug: 'trial-vencida', estado: 'trial', fechaVencimiento: haceDias(2) });
  await Tienda.create({ nombre: 'Activa vencida', slug: 'activa-vencida', estado: 'activa', fechaVencimiento: haceDias(1) });
  await Tienda.create({ nombre: 'Trial vigente', slug: 'trial-vigente', estado: 'trial', fechaVencimiento: enDias(5) });
  await Tienda.create({ nombre: 'Sin vencimiento', slug: 'sin-vencimiento', estado: 'activa' });
  await Tienda.create({ nombre: 'Ya pausada', slug: 'ya-pausada', estado: 'pausada', fechaVencimiento: haceDias(10) });

  const pausadas = await pausarVencidas();

  assert.equal(pausadas, 2);
  assert.equal((await Tienda.findOne({ slug: 'trial-vencida' })).estado, 'pausada');
  assert.equal((await Tienda.findOne({ slug: 'activa-vencida' })).estado, 'pausada');
  assert.equal((await Tienda.findOne({ slug: 'trial-vigente' })).estado, 'trial');
  assert.equal((await Tienda.findOne({ slug: 'sin-vencimiento' })).estado, 'activa');
});

test('pausarVencidas no hace nada si no hay vencidas', async () => {
  await Tienda.create({ nombre: 'Vigente', slug: 'vigente', estado: 'trial', fechaVencimiento: enDias(2) });
  assert.equal(await pausarVencidas(), 0);
});

test('resolverTienda bloquea una tienda con trial vencido', async () => {
  const tienda = await Tienda.create({
    nombre: 'Trial vencida',
    slug: 'trial-vencida',
    estado: 'trial',
    fechaVencimiento: haceDias(1),
  });

  let statusCode = 200;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await resolverTienda({ usuario: { id: 'u1', rol: 'admin', tienda: String(tienda._id) } }, res, () => {
    throw new Error('no debería continuar');
  });

  assert.equal(statusCode, 403);
  assert.equal(payload.codigo, 'TIENDA_PAUSADA');
});

test('el endpoint de cron exige el secreto configurado', async () => {
  const original = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    const sinConfigurar = await ejecutarMiddleware(requiereCron, { headers: {} });
    assert.equal(sinConfigurar.status, 503);
    assert.equal(sinConfigurar.body.codigo, 'CRON_NO_CONFIGURADO');

    process.env.CRON_SECRET = 'secreto-de-cron-de-prueba';
    const incorrecto = await ejecutarMiddleware(requiereCron, { headers: { authorization: 'Bearer nope' } });
    assert.equal(incorrecto.status, 401);

    const correcto = await ejecutarMiddleware(requiereCron, {
      headers: { authorization: 'Bearer secreto-de-cron-de-prueba' },
    });
    assert.equal(correcto.siguiente, true);
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});

test('el cron pausa las vencidas y devuelve la cantidad', async () => {
  await Tienda.create({ nombre: 'Vencida', slug: 'vencida', estado: 'trial', fechaVencimiento: haceDias(3) });

  const res = await runHandler(ejecutarPausaVencidas);

  assert.equal(res.status, 200);
  assert.equal(res.body.pausadas, 1);
  assert.equal((await Tienda.findOne({ slug: 'vencida' })).estado, 'pausada');
});
