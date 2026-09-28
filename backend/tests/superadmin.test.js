import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Pago from '../modules/Superadmin/PagoModel.js';
import {
  obtenerResumen,
  obtenerTiendas,
  obtenerTienda,
  cambiarEstado,
  registrarPago,
} from '../modules/Superadmin/SuperadminController.js';
import { schemaActualizarEstado, schemaRegistrarPago } from '../modules/Superadmin/SuperadminSchema.js';
import { requiereSuperadmin } from '../middlewares/TenantMiddleware.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const superadmin = { id: '507f1f77bcf86cd799439099', nombre: 'Super', rol: 'superadmin' };
const adminTienda = { id: '507f1f77bcf86cd799439011', nombre: 'Admin', rol: 'admin' };

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

test('requiereSuperadmin deja pasar al superadmin y rechaza al admin de tienda', async () => {
  const permitido = await ejecutarMiddleware(requiereSuperadmin, { usuario: superadmin });
  assert.equal(permitido.siguiente, true);

  const rechazado = await ejecutarMiddleware(requiereSuperadmin, { usuario: adminTienda });
  assert.equal(rechazado.status, 403);
});

test('el resumen cuenta tiendas por estado y muestra el cupo', async () => {
  await Tienda.create({ nombre: 'Trial', slug: 'trial-1', estado: 'trial' });
  await Tienda.create({ nombre: 'Activa', slug: 'activa-1', estado: 'activa' });
  await Tienda.create({ nombre: 'Pausada', slug: 'pausada-1', estado: 'pausada' });

  const res = await runHandler(obtenerResumen, { usuario: superadmin });

  assert.equal(res.status, 200);
  assert.equal(res.body.total, 3);
  assert.equal(res.body.trial, 1);
  assert.equal(res.body.activas, 1);
  assert.equal(res.body.pausadas, 1);
  assert.equal(res.body.cupo, 20);
});

test('el resumen cuenta las tiendas que vencen en los proximos 7 dias', async () => {
  await Tienda.create({ nombre: 'Por vencer', slug: 'por-vencer', estado: 'trial', fechaVencimiento: new Date(Date.now() + 3 * 86400000) });
  await Tienda.create({ nombre: 'Lejos', slug: 'lejos', estado: 'activa', fechaVencimiento: new Date(Date.now() + 30 * 86400000) });
  await Tienda.create({ nombre: 'Pausada', slug: 'pausada-2', estado: 'pausada', fechaVencimiento: new Date(Date.now() + 2 * 86400000) });

  const res = await runHandler(obtenerResumen, { usuario: superadmin });

  assert.equal(res.body.porVencer, 1);
});

test('el listado filtra por estado y por busqueda', async () => {
  await Tienda.create({ nombre: 'Ropa Linda', slug: 'ropa-linda', estado: 'activa' });
  await Tienda.create({ nombre: 'Zapateria', slug: 'zapateria', estado: 'pausada' });

  const activas = await runHandler(obtenerTiendas, { usuario: superadmin, query: { estado: 'activa' } });
  const busqueda = await runHandler(obtenerTiendas, { usuario: superadmin, query: { buscar: 'zapate' } });

  assert.equal(activas.body.length, 1);
  assert.equal(activas.body[0].slug, 'ropa-linda');
  assert.equal(busqueda.body.length, 1);
  assert.equal(busqueda.body[0].slug, 'zapateria');
});

test('el detalle devuelve la tienda con sus pagos', async () => {
  const tienda = await Tienda.create({ nombre: 'Con pagos', slug: 'con-pagos', estado: 'activa' });
  await Pago.create({ tienda: tienda._id, monto: 1500, metodo: 'transferencia' });

  const res = await runHandler(obtenerTienda, { usuario: superadmin, params: { id: String(tienda._id) } });
  const inexistente = await runHandler(obtenerTienda, { usuario: superadmin, params: { id: '507f1f77bcf86cd799439022' } });

  assert.equal(res.status, 200);
  assert.equal(res.body.tienda.slug, 'con-pagos');
  assert.equal(res.body.pagos.length, 1);
  assert.equal(inexistente.status, 404);
});

test('se puede pausar y reactivar una tienda', async () => {
  const tienda = await Tienda.create({ nombre: 'Interruptor', slug: 'interruptor', estado: 'activa' });

  const pausada = await runHandler(cambiarEstado, {
    usuario: superadmin,
    params: { id: String(tienda._id) },
    body: { estado: 'pausada' },
  });
  const activada = await runHandler(cambiarEstado, {
    usuario: superadmin,
    params: { id: String(tienda._id) },
    body: { estado: 'activa' },
  });

  assert.equal(pausada.body.estado, 'pausada');
  assert.equal(activada.body.estado, 'activa');
});

test('registrar un pago activa la tienda y extiende el vencimiento 30 dias', async () => {
  const tienda = await Tienda.create({ nombre: 'Morosa', slug: 'morosa', estado: 'pausada', fechaVencimiento: new Date(Date.now() - 5 * 86400000) });

  const res = await runHandler(registrarPago, {
    usuario: superadmin,
    params: { id: String(tienda._id) },
    body: { monto: 15000, metodo: 'transferencia', nota: 'Pago mensual' },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.tienda.estado, 'activa');
  assert.equal(res.body.pago.monto, 15000);

  const actualizada = await Tienda.findById(tienda._id);
  const dias = (actualizada.fechaVencimiento.getTime() - Date.now()) / 86400000;
  assert.ok(dias > 29 && dias <= 30);
  assert.equal(await Pago.countDocuments({ tienda: tienda._id }), 1);
});

test('el pago extiende desde el vencimiento futuro si todavia no vencio', async () => {
  const vencimientoFuturo = new Date(Date.now() + 10 * 86400000);
  const tienda = await Tienda.create({ nombre: 'Al dia', slug: 'al-dia', estado: 'activa', fechaVencimiento: vencimientoFuturo });

  const res = await runHandler(registrarPago, {
    usuario: superadmin,
    params: { id: String(tienda._id) },
    body: { monto: 15000, dias: 15 },
  });

  assert.equal(res.status, 201);
  const esperado = vencimientoFuturo.getTime() + 15 * 86400000;
  const actualizada = await Tienda.findById(tienda._id);
  assert.equal(actualizada.fechaVencimiento.getTime(), esperado);
});

test('registrar pago en una tienda inexistente devuelve 404', async () => {
  const res = await runHandler(registrarPago, {
    usuario: superadmin,
    params: { id: '507f1f77bcf86cd799439022' },
    body: { monto: 15000 },
  });
  assert.equal(res.status, 404);
});

test('los schemas de superadmin validan estado, monto y dias', () => {
  assert.equal(schemaActualizarEstado.safeParse({ estado: 'activa' }).success, true);
  assert.equal(schemaActualizarEstado.safeParse({ estado: 'otro' }).success, false);
  assert.equal(schemaRegistrarPago.safeParse({ monto: 100 }).success, true);
  assert.equal(schemaRegistrarPago.safeParse({ monto: -1 }).success, false);
  assert.equal(schemaRegistrarPago.safeParse({ monto: 100, dias: 0 }).success, false);
  assert.equal(schemaRegistrarPago.safeParse({ monto: 100, dias: 400 }).success, false);
});
