import mongoose from 'mongoose';
import '../config/env.js';
import Tienda from '../modules/Tienda/TiendaModel.js';
import Usuario from '../modules/Autenticacion/UsuarioModel.js';
import Producto from '../modules/Producto/ProductoModel.js';
import Proveedor from '../modules/Proveedor/ProveedorModel.js';
import MovimientoStock from '../modules/MovimientoStock/MovimientoStockModel.js';
import Venta from '../modules/Venta/VentaModel.js';
import CierreCaja from '../modules/Venta/CierreCajaModel.js';
import Devolucion from '../modules/Devolucion/DevolucionModel.js';
import RetiroCaja from '../modules/RetiroCaja/RetiroCajaModel.js';
import RetiroCajaDia from '../modules/RetiroCaja/RetiroCajaDiaModel.js';
import Notificacion from '../modules/Notificacion/NotificacionModel.js';
import SuscripcionPush from '../modules/Push/PushModel.js';

const APPLY = process.argv.includes('--apply');
const SLUG = String(process.env.TIENDA_DEFAULT_SLUG || 'principal').trim().toLowerCase();
const NOMBRE = process.env.TIENDA_DEFAULT_NOMBRE || 'Tienda principal';

const MODELOS = [
  Usuario,
  Producto,
  Proveedor,
  MovimientoStock,
  Venta,
  CierreCaja,
  Devolucion,
  RetiroCaja,
  RetiroCajaDia,
  Notificacion,
  SuscripcionPush,
];

const filtroPendientes = (modelo) => {
  const filtro = { tienda: { $exists: false } };
  if (modelo === Usuario) filtro.rol = { $ne: 'superadmin' };
  return filtro;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  console.log(APPLY ? 'MODO APPLY: se modificarán los datos' : 'MODO DRY-RUN: no se modifica nada');

  let tienda = await Tienda.findOne({ slug: SLUG });
  if (!tienda) {
    if (!APPLY) {
      console.log(`[pendiente] Crear tienda "${SLUG}" (${NOMBRE})`);
    } else {
      tienda = await Tienda.create({
        nombre: NOMBRE,
        slug: SLUG,
        estado: 'activa',
        whatsapp: process.env.TIENDA_DEFAULT_WHATSAPP || '',
      });
      console.log(`[creada] Tienda "${SLUG}"`);
    }
  } else {
    console.log(`[ok] La tienda "${SLUG}" ya existe`);
  }

  if (!tienda && APPLY) throw new Error('No se pudo crear la tienda por defecto');

  let total = 0;
  for (const modelo of MODELOS) {
    const filtro = filtroPendientes(modelo);
    const cantidad = await modelo.countDocuments(filtro);
    if (cantidad === 0) continue;
    if (!APPLY) {
      console.log(`[pendiente] ${modelo.modelName}: ${cantidad} documento(s) sin tienda`);
      total += cantidad;
      continue;
    }
    const resultado = await modelo.updateMany(filtro, { $set: { tienda: tienda._id } });
    console.log(`[migrado] ${modelo.modelName}: ${resultado.modifiedCount} documento(s)`);
    total += resultado.modifiedCount;
  }

  if (APPLY) {
    console.log('\nSincronizando índices...');
    for (const modelo of MODELOS) {
      await modelo.syncIndexes();
      console.log(`[indices] ${modelo.modelName} sincronizados`);
    }
  }

  console.log(`\nResumen: ${total} documento(s) afectado(s).`);
  if (!APPLY) console.log('Dry-run finalizado. Para aplicar: node scripts/migrar-multitenant.js --apply');
};

run()
  .catch((error) => {
    console.error('Error en la migración:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
