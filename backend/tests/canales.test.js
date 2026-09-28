import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Producto from '../modules/Producto/ProductoModel.js';
import MovimientoStock from '../modules/MovimientoStock/MovimientoStockModel.js';
import {
  pasarAlCatalogo,
  retirarDelCatalogo,
  agregarCatalogo,
  actualizarProducto,
} from '../modules/Producto/ProductoController.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const crearTienda = (slug) => Tienda.create({ nombre: `Tienda ${slug}`, slug, estado: 'activa' });

const usuarioDe = (tienda) => ({ id: 'u1', nombre: 'Admin', rol: 'admin', tienda: String(tienda._id) });

test('pasarAlCatalogo mueve stock del deposito al catalogo', async () => {
  const tienda = await crearTienda('canal-uno');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Buzo',
    precio: 1000,
    cantidad: 0,
    deposito: 10,
    catalogo: 0,
    categoria: 'Ropa',
  });

  const res = await runHandler(pasarAlCatalogo, {
    usuario: usuarioDe(tienda),
    body: { articulos: [{ producto: String(producto._id), cantidad: 4 }] },
  });

  assert.equal(res.status, 200);
  const actualizado = await Producto.findById(producto._id);
  assert.equal(actualizado.deposito, 6);
  assert.equal(actualizado.catalogo, 4);

  const movimiento = await MovimientoStock.findOne({ producto: producto._id, tipo: 'reposicion_catalogo' });
  assert.equal(movimiento.cantidad, 4);
});

test('pasarAlCatalogo con variantes mantiene los totales', async () => {
  const tienda = await crearTienda('canal-variantes');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Remera',
    precio: 1000,
    categoria: 'Ropa',
    variantes: [{ talle: 'M', color: 'Rojo', cantidad: 1, deposito: 5, catalogo: 0 }],
  });

  const res = await runHandler(pasarAlCatalogo, {
    usuario: usuarioDe(tienda),
    body: { articulos: [{ producto: String(producto._id), cantidad: 3, talle: 'M', color: 'Rojo' }] },
  });

  assert.equal(res.status, 200);
  const actualizado = await Producto.findById(producto._id);
  assert.equal(actualizado.variantes[0].deposito, 2);
  assert.equal(actualizado.variantes[0].catalogo, 3);
  assert.equal(actualizado.catalogo, 3);
  assert.equal(actualizado.cantidad, 1);
});

test('pasarAlCatalogo rechaza si no hay deposito suficiente', async () => {
  const tienda = await crearTienda('canal-sin-deposito');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Buzo',
    precio: 1000,
    deposito: 1,
    catalogo: 0,
    categoria: 'Ropa',
  });

  const res = await runHandler(pasarAlCatalogo, {
    usuario: usuarioDe(tienda),
    body: { articulos: [{ producto: String(producto._id), cantidad: 5 }] },
  });

  assert.equal(res.status, 400);
  const actualizado = await Producto.findById(producto._id);
  assert.equal(actualizado.deposito, 1);
  assert.equal(actualizado.catalogo, 0);
});

test('retirarDelCatalogo mueve stock del catalogo al deposito', async () => {
  const tienda = await crearTienda('canal-retiro');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Buzo',
    precio: 1000,
    deposito: 0,
    catalogo: 5,
    categoria: 'Ropa',
  });

  const res = await runHandler(retirarDelCatalogo, {
    usuario: usuarioDe(tienda),
    params: { id: String(producto._id) },
    body: { cantidad: 2 },
  });

  assert.equal(res.status, 200);
  const actualizado = await Producto.findById(producto._id);
  assert.equal(actualizado.catalogo, 3);
  assert.equal(actualizado.deposito, 2);

  const movimiento = await MovimientoStock.findOne({ producto: producto._id, tipo: 'retiro_catalogo' });
  assert.equal(movimiento.cantidad, 2);
});

test('agregarCatalogo fija el stock y registra el movimiento', async () => {
  const tienda = await crearTienda('canal-ajuste');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Buzo',
    precio: 1000,
    catalogo: 1,
    categoria: 'Ropa',
  });

  const res = await runHandler(agregarCatalogo, {
    usuario: usuarioDe(tienda),
    params: { id: String(producto._id) },
    body: { cantidad: 7, modo: 'fijar' },
  });

  assert.equal(res.status, 200);
  assert.equal((await Producto.findById(producto._id)).catalogo, 7);

  const movimiento = await MovimientoStock.findOne({ producto: producto._id, tipo: 'ajuste_catalogo' });
  assert.equal(movimiento.cantidad, 6);
});

test('actualizarProducto no pisa el stock de catalogo si no se envia', async () => {
  const tienda = await crearTienda('canal-actualizar');
  const producto = await Producto.create({
    tienda: tienda._id,
    nombre: 'Remera',
    precio: 1000,
    categoria: 'Ropa',
    variantes: [{ talle: 'M', color: '', cantidad: 2, deposito: 1, catalogo: 4 }],
  });

  const res = await runHandler(actualizarProducto, {
    usuario: usuarioDe(tienda),
    params: { id: String(producto._id) },
    body: { variantes: [{ talle: 'M', color: '', deposito: 1 }] },
  });

  assert.equal(res.status, 200);
  const actualizado = await Producto.findById(producto._id);
  assert.equal(actualizado.variantes[0].catalogo, 4);
  assert.equal(actualizado.catalogo, 4);
});
