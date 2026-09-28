import './helpers/setup-env.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDB, stopTestDB, clearDB, runHandler } from './helpers/db.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Producto from '../modules/Producto/ProductoModel.js';
import Proveedor from '../modules/Proveedor/ProveedorModel.js';
import Venta from '../modules/Venta/VentaModel.js';
import CierreCaja from '../modules/Venta/CierreCajaModel.js';
import Usuario from '../modules/Autenticacion/UsuarioModel.js';
import { obtenerProductos, obtenerProducto, siguienteCodigo } from '../modules/Producto/ProductoController.js';
import { crearProveedor } from '../modules/Proveedor/ProveedorController.js';
import { obtenerVentas } from '../modules/Venta/VentaController.js';
import { obtenerCajaAbierta } from '../modules/Venta/VentaController.js';
import { cambiarActivo } from '../modules/Usuario/UsuarioController.js';
import { iniciarSesion } from '../modules/Autenticacion/AutenticacionController.js';
import { resolverTienda, resolverTiendaPublica } from '../middlewares/TenantMiddleware.js';
import { buscarCajaAbierta } from '../utils/CajaUtils.js';

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
  Tienda.create({ nombre: `Tienda ${slug}`, slug, estado: 'activa', ...extra });

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
  return { req, status: statusCode, body: payload, siguiente };
};

test('cada tienda solo ve sus propios productos', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  await Producto.create({ tienda: tiendaA._id, nombre: 'Remera A', precio: 100, cantidad: 3, categoria: 'Ropa' });
  await Producto.create({ tienda: tiendaB._id, nombre: 'Pantalón B', precio: 200, cantidad: 5, categoria: 'Ropa' });

  const vistaA = await runHandler(obtenerProductos, { usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) } });
  const vistaB = await runHandler(obtenerProductos, { usuario: { id: 'u2', rol: 'admin', tienda: String(tiendaB._id) } });

  assert.equal(vistaA.status, 200);
  assert.equal(vistaA.body.length, 1);
  assert.equal(vistaA.body[0].nombre, 'Remera A');
  assert.equal(vistaB.body.length, 1);
  assert.equal(vistaB.body[0].nombre, 'Pantalón B');
});

test('no se puede obtener un producto de otra tienda por id', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  const productoB = await Producto.create({ tienda: tiendaB._id, nombre: 'Solo B', precio: 100, cantidad: 1, categoria: 'Ropa' });

  const res = await runHandler(obtenerProducto, {
    params: { id: String(productoB._id) },
    usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) },
  });

  assert.equal(res.status, 404);
});

test('el codigo de producto es unico por tienda, no global', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  await Producto.create({ tienda: tiendaA._id, nombre: 'Uno', precio: 100, cantidad: 1, categoria: 'Ropa', codigo: 'NC-000001' });
  await Producto.create({ tienda: tiendaB._id, nombre: 'Dos', precio: 100, cantidad: 1, categoria: 'Ropa', codigo: 'NC-000001' });

  await assert.rejects(
    Producto.create({ tienda: tiendaA._id, nombre: 'Tres', precio: 100, cantidad: 1, categoria: 'Ropa', codigo: 'NC-000001' }),
    (error) => error.code === 11000
  );
});

test('los codigos internos se generan por tienda de forma independiente', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');

  const primeroA = await runHandler(siguienteCodigo, { usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) } });
  const primeroB = await runHandler(siguienteCodigo, { usuario: { id: 'u2', rol: 'admin', tienda: String(tiendaB._id) } });
  const segundoA = await runHandler(siguienteCodigo, { usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) } });

  assert.equal(primeroA.body.codigo, 'NC-000001');
  assert.equal(primeroB.body.codigo, 'NC-000001');
  assert.equal(segundoA.body.codigo, 'NC-000002');
});

test('el proveedor duplicado se controla por tienda', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  const usuarioA = { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) };
  const usuarioB = { id: 'u2', rol: 'admin', tienda: String(tiendaB._id) };

  const primera = await runHandler(crearProveedor, { body: { nombre: 'Proveedor X' }, usuario: usuarioA });
  const enOtraTienda = await runHandler(crearProveedor, { body: { nombre: 'Proveedor X' }, usuario: usuarioB });
  const duplicada = await runHandler(crearProveedor, { body: { nombre: 'Proveedor X' }, usuario: usuarioA });

  assert.equal(primera.status, 201);
  assert.equal(enOtraTienda.status, 201);
  assert.equal(duplicada.status, 409);
  assert.equal(await Proveedor.countDocuments({ tienda: tiendaA._id }), 1);
  assert.equal(await Proveedor.countDocuments({ tienda: tiendaB._id }), 1);
});

test('las ventas se listan solo de la tienda del usuario', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  await Venta.create({ tienda: tiendaA._id, total: 100, empleado: 'A', pagos: [{ metodo: 'efectivo', monto: 100 }] });
  await Venta.create({ tienda: tiendaB._id, total: 500, empleado: 'B', pagos: [{ metodo: 'efectivo', monto: 500 }] });

  const res = await runHandler(obtenerVentas, { usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) } });

  assert.equal(res.status, 200);
  assert.equal(res.body.ventas.length, 1);
  assert.equal(res.body.ventas[0].empleado, 'A');
});

test('la caja abierta es independiente por tienda', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  await CierreCaja.create({ tienda: tiendaA._id, fecha: new Date(), turno: 'dia', estado: 'abierto', abiertaEn: new Date(), fondoInicial: 0 });
  await CierreCaja.create({ tienda: tiendaB._id, fecha: new Date(), turno: 'dia', estado: 'abierto', abiertaEn: new Date(), fondoInicial: 0 });

  const cajaA = await buscarCajaAbierta(null, tiendaA._id);
  const cajaB = await buscarCajaAbierta(null, tiendaB._id);
  assert.equal(String(cajaA.tienda), String(tiendaA._id));
  assert.equal(String(cajaB.tienda), String(tiendaB._id));

  const res = await runHandler(obtenerCajaAbierta, { usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) } });
  assert.equal(res.status, 200);
  assert.equal(String(res.body.caja.tienda), String(tiendaA._id));
});

test('no se puede cambiar el estado de un usuario de otra tienda', async () => {
  const tiendaA = await crearTienda('tienda-a');
  const tiendaB = await crearTienda('tienda-b');
  const usuarioB = await Usuario.create({ nombre: 'Emp B', email: 'emp-b@x.com', clave: 'secreto123', rol: 'user', tienda: tiendaB._id });

  const res = await runHandler(cambiarActivo, {
    params: { id: String(usuarioB._id) },
    body: { activo: false },
    usuario: { id: 'u1', rol: 'admin', tienda: String(tiendaA._id) },
  });

  assert.equal(res.status, 404);
  assert.equal((await Usuario.findById(usuarioB._id)).activo, true);
});

test('el login devuelve la tienda del usuario', async () => {
  const tienda = await crearTienda('tienda-login');
  await Usuario.create({ nombre: 'Admin', email: 'admin@login.com', clave: 'secreto123', rol: 'admin', tienda: tienda._id });

  const res = await runHandler(iniciarSesion, { body: { email: 'admin@login.com', clave: 'secreto123' } });

  assert.equal(res.status, 200);
  assert.equal(String(res.body.tienda), String(tienda._id));
});

test('resolverTienda rechaza usuarios sin tienda', async () => {
  const resultado = await ejecutarMiddleware(resolverTienda, { usuario: { id: 'u1', rol: 'admin' } });
  assert.equal(resultado.status, 403);
  assert.equal(resultado.body.codigo, 'SIN_TIENDA');
});

test('resolverTienda rechaza tiendas pausadas y acepta activas', async () => {
  const pausada = await crearTienda('tienda-pausada', { estado: 'pausada' });
  const activa = await crearTienda('tienda-activa');

  const rechazada = await ejecutarMiddleware(resolverTienda, { usuario: { id: 'u1', rol: 'admin', tienda: String(pausada._id) } });
  assert.equal(rechazada.status, 403);
  assert.equal(rechazada.body.codigo, 'TIENDA_PAUSADA');

  const aceptada = await ejecutarMiddleware(resolverTienda, { usuario: { id: 'u2', rol: 'admin', tienda: String(activa._id) } });
  assert.equal(aceptada.siguiente, true);
  assert.equal(String(aceptada.req.tienda._id), String(activa._id));
});

test('resolverTiendaPublica resuelve por slug y bloquea pausadas', async () => {
  const activa = await crearTienda('catalogo-activo');
  const pausada = await crearTienda('catalogo-pausado', { estado: 'pausada' });

  const encontrada = await ejecutarMiddleware(resolverTiendaPublica, { params: { slug: 'catalogo-activo' } });
  assert.equal(encontrada.siguiente, true);
  assert.equal(String(encontrada.req.tienda._id), String(activa._id));

  const bloqueada = await ejecutarMiddleware(resolverTiendaPublica, { params: { slug: 'catalogo-pausado' } });
  assert.equal(bloqueada.status, 403);

  const inexistente = await ejecutarMiddleware(resolverTiendaPublica, { params: { slug: 'no-existe' } });
  assert.equal(inexistente.status, 404);
});
