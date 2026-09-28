import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Producto from '../modules/Producto/ProductoModel.js';
import Pedido from '../modules/Pedido/PedidoModel.js';
import {
  obtenerTiendaPublica,
  obtenerProductosPublicos,
  obtenerCategoriasPublicas,
  crearPedidoPublico,
} from '../modules/Publico/PublicoController.js';
import { obtenerPedidos, cambiarEstadoPedido } from '../modules/Pedido/PedidoController.js';
import { requiereCatalogo } from '../middlewares/TenantMiddleware.js';

before(async () => {
  await startTestDB();
});

after(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await clearDB();
});

const crearTienda = (slug, extra = {}) =>
  Tienda.create({ nombre: `Tienda ${slug}`, slug, estado: 'activa', whatsapp: '5491122334455', ...extra });

const crearProducto = (tienda, extra = {}) =>
  Producto.create({ tienda: tienda._id, nombre: 'Remera', precio: 1500, cantidad: 5, catalogo: 5, categoria: 'Ropa', ...extra });

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

test('la tienda publica expone solo datos del catalogo', async () => {
  const tienda = await crearTienda('catalogo-uno');
  const res = await runHandler(obtenerTiendaPublica, { tienda });

  assert.equal(res.status, 200);
  assert.equal(res.body.nombre, 'Tienda catalogo-uno');
  assert.equal(res.body.slug, 'catalogo-uno');
  assert.equal(res.body.whatsapp, '5491122334455');
  assert.equal(res.body.modoVenta, 'ambos');
  assert.ok(!('estado' in res.body));
  assert.ok(!('dueno' in res.body));
});

test('requiereCatalogo rechaza tiendas que solo venden en local', async () => {
  const tienda = await crearTienda('solo-local', { modoVenta: 'local' });
  const resultado = await ejecutarMiddleware(requiereCatalogo, { tienda });

  assert.equal(resultado.status, 404);
  assert.equal(resultado.body.codigo, 'SIN_CATALOGO');
});

test('el catalogo solo muestra productos de la tienda del slug', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  await crearProducto(tiendaA, { nombre: 'Remera A' });
  await crearProducto(tiendaB, { nombre: 'Pantalón B' });

  const res = await runHandler(obtenerProductosPublicos, { tienda: tiendaA });

  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].nombre, 'Remera A');
  assert.equal(res.body[0].codigo, undefined);
  assert.equal(res.body[0].proveedor, undefined);
});

test('el catalogo publico filtra por categoria y busqueda', async () => {
  const tienda = await crearTienda('tienda-filtros');
  await crearProducto(tienda, { nombre: 'Remera azul', categoria: 'Ropa' });
  await crearProducto(tienda, { nombre: 'Zapatilla', categoria: 'Calzado' });

  const porCategoria = await runHandler(obtenerProductosPublicos, { tienda, query: { categoria: 'calzado' } });
  const porBusqueda = await runHandler(obtenerProductosPublicos, { tienda, query: { search: 'azul' } });

  assert.equal(porCategoria.body.length, 1);
  assert.equal(porCategoria.body[0].nombre, 'Zapatilla');
  assert.equal(porBusqueda.body.length, 1);
  assert.equal(porBusqueda.body[0].nombre, 'Remera azul');
});

test('las categorias publicas son solo de la tienda', async () => {
  const tiendaA = await crearTienda('categorias-a');
  const tiendaB = await crearTienda('categorias-b');
  await crearProducto(tiendaA, { categoria: 'Ropa' });
  await crearProducto(tiendaB, { categoria: 'Calzado' });

  const res = await runHandler(obtenerCategoriasPublicas, { tienda: tiendaA });

  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].nombre, 'Ropa');
});

test('crear un pedido calcula el total en el servidor y arma el link de WhatsApp', async () => {
  const tienda = await crearTienda('pedidos-uno');
  const producto = await crearProducto(tienda, { precio: 1500 });

  const res = await runHandler(crearPedidoPublico, {
    tienda,
    body: {
      cliente: { nombre: 'Ana', telefono: '1144556677', nota: 'Timbre 2' },
      items: [{ producto: String(producto._id), cantidad: 2 }],
      metodoPago: 'transferencia',
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.pedido.total, 3000);
  assert.equal(res.body.pedido.items[0].precio, 1500);
  assert.equal(res.body.pedido.estado, 'pendiente');
  assert.equal(res.body.pedido.numero, 1);
  assert.ok(res.body.whatsapp.startsWith('https://wa.me/5491122334455'));
  assert.equal(await Pedido.countDocuments({ tienda: tienda._id }), 1);
});

test('los pedidos se numeran por tienda de forma independiente', async () => {
  const tiendaA = await crearTienda('numeros-a');
  const tiendaB = await crearTienda('numeros-b');
  const productoA = await crearProducto(tiendaA);
  const productoB = await crearProducto(tiendaB);

  const pedidoA1 = await runHandler(crearPedidoPublico, {
    tienda: tiendaA,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(productoA._id), cantidad: 1 }] },
  });
  const pedidoA2 = await runHandler(crearPedidoPublico, {
    tienda: tiendaA,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(productoA._id), cantidad: 1 }] },
  });
  const pedidoB = await runHandler(crearPedidoPublico, {
    tienda: tiendaB,
    body: { cliente: { nombre: 'Luis', telefono: '1144556688' }, items: [{ producto: String(productoB._id), cantidad: 1 }] },
  });

  assert.equal(pedidoA1.body.pedido.numero, 1);
  assert.equal(pedidoA2.body.pedido.numero, 2);
  assert.equal(pedidoB.body.pedido.numero, 1);
});

test('no se puede pedir mas stock del disponible', async () => {
  const tienda = await crearTienda('sin-stock');
  const producto = await crearProducto(tienda, { cantidad: 1, catalogo: 1 });

  const res = await runHandler(crearPedidoPublico, {
    tienda,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(producto._id), cantidad: 5 }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.codigo, 'SIN_STOCK');
  assert.equal(await Pedido.countDocuments(), 0);
  assert.equal((await Producto.findById(producto._id)).catalogo, 1);
});

test('el pedido descuenta stock del catalogo', async () => {
  const tienda = await crearTienda('descuenta-catalogo');
  const producto = await crearProducto(tienda, { catalogo: 4 });

  const res = await runHandler(crearPedidoPublico, {
    tienda,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(producto._id), cantidad: 2 }] },
  });

  assert.equal(res.status, 201);
  assert.equal((await Producto.findById(producto._id)).catalogo, 2);
});

test('cancelar un pedido devuelve el stock al catalogo', async () => {
  const tienda = await crearTienda('cancela-pedido');
  const producto = await crearProducto(tienda, { catalogo: 4 });

  const creado = await runHandler(crearPedidoPublico, {
    tienda,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(producto._id), cantidad: 3 }] },
  });
  assert.equal((await Producto.findById(producto._id)).catalogo, 1);

  const cancelado = await runHandler(cambiarEstadoPedido, {
    usuario: { id: 'u1', nombre: 'Admin', rol: 'admin', tienda: String(tienda._id) },
    params: { id: String(creado.body.pedido._id) },
    body: { estado: 'cancelado' },
  });

  assert.equal(cancelado.status, 200);
  assert.equal(cancelado.body.stockDescontado, false);
  assert.equal((await Producto.findById(producto._id)).catalogo, 4);

  const recancelado = await runHandler(cambiarEstadoPedido, {
    usuario: { id: 'u1', nombre: 'Admin', rol: 'admin', tienda: String(tienda._id) },
    params: { id: String(creado.body.pedido._id) },
    body: { estado: 'cancelado' },
  });
  assert.equal(recancelado.status, 200);
  assert.equal((await Producto.findById(producto._id)).catalogo, 4);
});

test('no se puede pedir un producto de otra tienda', async () => {
  const tiendaA = await crearTienda('compra-a');
  const tiendaB = await crearTienda('compra-b');
  const productoB = await crearProducto(tiendaB);

  const res = await runHandler(crearPedidoPublico, {
    tienda: tiendaA,
    body: { cliente: { nombre: 'Ana', telefono: '1144556677' }, items: [{ producto: String(productoB._id), cantidad: 1 }] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.codigo, 'PRODUCTO_NO_DISPONIBLE');
});

test('el panel lista solo los pedidos de su tienda', async () => {
  const tiendaA = await crearTienda('panel-a');
  const tiendaB = await crearTienda('panel-b');
  await Pedido.create({ tienda: tiendaA._id, numero: 1, cliente: { nombre: 'Ana', telefono: '11' }, total: 100 });
  await Pedido.create({ tienda: tiendaB._id, numero: 1, cliente: { nombre: 'Luis', telefono: '11' }, total: 200 });

  const res = await runHandler(obtenerPedidos, {
    usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].cliente.nombre, 'Ana');
});

test('se puede cambiar el estado de un pedido y queda en el historial', async () => {
  const tienda = await crearTienda('estados');
  const pedido = await Pedido.create({ tienda: tienda._id, numero: 1, cliente: { nombre: 'Ana', telefono: '11' }, total: 100 });

  const res = await runHandler(cambiarEstadoPedido, {
    usuario: { id: 'u1', nombre: 'Admin', rol: 'admin', tienda: String(tienda._id) },
    params: { id: String(pedido._id) },
    body: { estado: 'confirmado' },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'confirmado');
  assert.equal(res.body.historial.length, 1);
  assert.equal(res.body.historial[0].estado, 'confirmado');
});

test('no se puede cambiar el estado de un pedido de otra tienda', async () => {
  const tiendaA = await crearTienda('estados-a');
  const tiendaB = await crearTienda('estados-b');
  const pedidoB = await Pedido.create({ tienda: tiendaB._id, numero: 1, cliente: { nombre: 'Luis', telefono: '11' }, total: 100 });

  const res = await runHandler(cambiarEstadoPedido, {
    usuario: { id: 'u1', nombre: 'Admin', rol: 'admin', tienda: String(tiendaA._id) },
    params: { id: String(pedidoB._id) },
    body: { estado: 'cancelado' },
  });

  assert.equal(res.status, 404);
  assert.equal((await Pedido.findById(pedidoB._id)).estado, 'pendiente');
});
