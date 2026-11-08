import mongoose from 'mongoose';
import Producto from './ProductoModel.js';
import AumentoPrecio from './AumentoPrecioModel.js';
import Devolucion from '../Devolucion/DevolucionModel.js';
import Venta from '../Venta/VentaModel.js';
import Proveedor from '../Proveedor/ProveedorModel.js';
import Contador from '../Venta/ContadorModel.js';
import MovimientoStock from '../MovimientoStock/MovimientoStockModel.js';
import Promocion from '../Promocion/PromocionModel.js';
import { schemaCrearProducto, schemaActualizarProducto, schemaIntercambio, schemaAgregarStock, schemaMovimientoStock, schemaDeposito, schemaCatalogo, schemaPasarSalon, schemaAumentoPrecio } from './ProductoSchema.js';
import { enviarEvento, enviarStockBajo } from '../../services/PushService.js';
import { indiceDeVariante, depositoDe, catalogoDe } from '../../utils/VariantesUtils.js';
import { ejecutarCambio } from '../Devolucion/DevolucionService.js';
import { responderErrorDeServicio } from '../../utils/RespuestaErrorUtils.js';
import { conReintentos } from '../../utils/TransaccionesUtils.js';
import { filtroTienda, datosTienda, idTienda, conTienda } from '../../utils/TenantUtils.js';
import { promocionesVigentes } from '../Promocion/PromocionService.js';
import { ofertaDeProducto } from '../../utils/PreciosUtils.js';
import { aCentavos, deCentavos } from '../../utils/DineroUtils.js';
import { faltanCodigosDeVariante, variantePorCodigo } from '../../utils/CodigosVarianteUtils.js';
import logger from '../../utils/LoggerUtils.js';

const escaparRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const claveVariante = (talle, color) =>
  `${String(talle ?? '').trim().toLowerCase()}|${String(color ?? '').trim().toLowerCase()}`;

const normalizarCodigo = (codigo) => {
  const limpio = String(codigo || '').trim();
  return limpio || undefined;
};

const buscarPorCodigoExacto = (codigo, tienda = null) =>
  Producto.findOne(conTienda(tienda, { codigo: { $regex: `^${escaparRegex(codigo)}$`, $options: 'i' } }));

const CODIGO_INTERNO_REGEX = /^NC-\d{6}$/;

const claveContadorProducto = (tienda = null) => (tienda ? `producto:${tienda}` : 'producto');

const intentarCodigoProducto = async (tienda = null) => {
  const counter = await Contador.findByIdAndUpdate(
    claveContadorProducto(tienda),
    { $inc: { secuencia: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const codigo = `NC-${String(counter.secuencia).padStart(6, '0')}`;
  const repetido = await buscarPorCodigoExacto(codigo, tienda);
  return repetido ? null : codigo;
};

const sincronizarContadorProducto = async (tienda = null) => {
  const ultimo = await Producto.findOne(conTienda(tienda, { codigo: /^NC-\d{6}$/ }))
    .sort({ codigo: -1 })
    .select('codigo')
    .lean();
  if (!ultimo) return;
  const secuencia = Number(String(ultimo.codigo).slice(3));
  if (!Number.isFinite(secuencia)) return;
  await Contador.findByIdAndUpdate(
    claveContadorProducto(tienda),
    { $max: { secuencia } },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const generarCodigoProducto = async (tienda = null) => {
  for (let intento = 0; intento < 50; intento += 1) {
    const codigo = await intentarCodigoProducto(tienda);
    if (codigo) return codigo;
  }
  await sincronizarContadorProducto(tienda);
  for (let intento = 0; intento < 50; intento += 1) {
    const codigo = await intentarCodigoProducto(tienda);
    if (codigo) return codigo;
  }
  throw new Error('No se pudo generar un código único de producto');
};

const registrarMovimiento = async ({ producto, talle, color, tipo, cantidad, empleado, tienda }, session) => {
  await MovimientoStock.create(
    [{
      producto: producto._id,
      productoNombre: producto.nombre,
      talle: talle || '',
      color: color || '',
      tipo,
      cantidad,
      empleado: empleado || '',
      ...(tienda ? { tienda } : {}),
    }],
    session ? { session } : undefined
  );
};

const depositoTotalExpr = {
  $cond: [
    { $gt: [{ $size: { $ifNull: ['$variantes', []] } }, 0] },
    { $sum: '$variantes.deposito' },
    { $ifNull: ['$deposito', 0] },
  ],
};

const salonTotalExpr = {
  $cond: [
    { $gt: [{ $size: { $ifNull: ['$variantes', []] } }, 0] },
    { $sum: '$variantes.cantidad' },
    { $ifNull: ['$cantidad', 0] },
  ],
};

const esVerdadero = (valor) => valor === '1' || valor === 'true';

const rechazarSiEnPapelera = (res, product) => {
  if (!product?.enPapelera) return false;
  res.status(409).json({
    message: `"${product.nombre}" está en la papelera. Restauralo desde la papelera para operar con él.`,
    code: 'EN_PAPELERA',
  });
  return true;
};

export const obtenerProductos = async (req, res, next) => {
  try {
    const { search, categoria } = req.query;
    const filter = filtroTienda(req);

    const usuarioEsAdmin = req.usuario?.rol === 'admin';
    if (esVerdadero(req.query.papelera) && usuarioEsAdmin) {
      filter.enPapelera = true;
    } else {
      filter.enPapelera = { $ne: true };
    }

    if (search) {
      const safe = escaparRegex(search);
      filter.$or = [
        { nombre: { $regex: safe, $options: 'i' } },
        { categoria: { $regex: safe, $options: 'i' } },
        { codigo: { $regex: safe, $options: 'i' } },
        { 'variantes.codigo': { $regex: safe, $options: 'i' } },
      ];
    }
    const categoriaFiltro = String(categoria || '').trim();
    if (categoriaFiltro) {
      filter.categoria = { $regex: `^${escaparRegex(categoriaFiltro)}$`, $options: 'i' };
    }
    if (esVerdadero(req.query.soloDeposito)) {
      filter.$expr = { $gt: [depositoTotalExpr, 0] };
    }

    if (esVerdadero(req.query.soloIds)) {
      const docs = await Producto.find(filter).select('_id').lean();
      return res.json({ ids: docs.map((d) => d._id) });
    }

    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const limite = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 2000);
    const conTotal = esVerdadero(req.query.conTotal);
    const conMetricas = esVerdadero(req.query.conMetricas);

    const products = await Producto.find(filter).sort({ nombre: 1, _id: 1 }).skip(offset).limit(limite);
    const promociones = await promocionesVigentes();
    const mapeados = products.map((product) => ({
      ...product.toJSON(),
      oferta: ofertaDeProducto(product, promociones),
    }));

    if (!conTotal) {
      return res.json(mapeados);
    }

    const total = await Producto.countDocuments(filter);
    const respuesta = { productos: mapeados, total };

    if (conMetricas) {
      const [agregado] = await Producto.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            valorDepositoCentavos: {
              $sum: { $multiply: [depositoTotalExpr, { $ifNull: ['$precio', 0] }] },
            },
            bajosSalon: {
              $sum: { $cond: [{ $lte: [salonTotalExpr, { $ifNull: ['$stockMinimo', 0] }] }, 1, 0] },
            },
          },
        },
      ]);
      respuesta.metricas = {
        valorDeposito: Math.round(agregado?.valorDepositoCentavos || 0) / 100,
        bajosSalon: agregado?.bajosSalon || 0,
      };
    }

    res.json(respuesta);
  } catch (error) {
    next(error);
  }
};

export const obtenerCategorias = async (req, res, next) => {
  try {
    const tienda = idTienda(req);
    const categorias = await Producto.aggregate([
      { $match: { ...(tienda ? { tienda: new mongoose.Types.ObjectId(tienda) } : {}), categoria: { $nin: [null, ''] }, enPapelera: { $ne: true } } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$categoria' } } },
          nombre: { $min: { $trim: { input: '$categoria' } } },
          cantidad: { $sum: 1 },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, nombre: 1, cantidad: 1 } },
    ]);

    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

export const obtenerProductoPorCodigo = async (req, res, next) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    if (!codigo) {
      return res.status(400).json({ message: 'El código es requerido' });
    }
    let product = await buscarPorCodigoExacto(codigo, idTienda(req));
    let variante = null;
    if (!product) {
      product = await Producto.findOne(conTienda(idTienda(req), {
        variantes: { $elemMatch: { codigo: { $regex: `^${escaparRegex(codigo)}$`, $options: 'i' } } },
      }));
      if (product) {
        const encontrada = variantePorCodigo(product, codigo);
        if (encontrada) variante = { talle: encontrada.talle || '', color: encontrada.color || '' };
      }
    }
    if (!product) {
      return res.status(404).json({ message: `No existe un producto con el código "${codigo}"` });
    }
    if (product.enPapelera) {
      const esAdmin = req.usuario?.rol === 'admin';
      return res.status(410).json({
        message: esAdmin
          ? `"${product.nombre}" está en la papelera. Restauralo desde la papelera para venderlo.`
          : 'Este producto no está disponible para la venta.',
        code: 'EN_PAPELERA',
      });
    }
    const promociones = await promocionesVigentes();
    res.json({
      ...product.toJSON(),
      oferta: ofertaDeProducto(product, promociones),
      ...(variante ? { variante } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const migrarCodigosVariante = async () => {
  const productos = await Producto.find({
    codigo: { $nin: [null, ''] },
    'variantes.0': { $exists: true },
  }).select('nombre codigo variantes siguienteSufijoVariante');

  let migrados = 0;
  for (const producto of productos) {
    try {
      if (!faltanCodigosDeVariante(producto)) continue;
      await producto.save();
      migrados += 1;
    } catch (error) {
      logger.warn('No se pudieron generar los códigos de variante del producto', {
        motivo: error?.message || 'Error desconocido',
        producto: producto.nombre || String(producto._id),
        origen: 'backend',
        lugar: 'migrarCodigosVariante',
      });
    }
  }
  return migrados;
};

export const siguienteCodigo = async (req, res, next) => {
  try {
    const codigo = await generarCodigoProducto(idTienda(req));
    res.json({ codigo });
  } catch (error) {
    next(error);
  }
};

export const obtenerProducto = async (req, res, next) => {
  try {
    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (product.enPapelera && req.usuario?.rol !== 'admin') {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const promociones = await promocionesVigentes();
    const [ventas, devoluciones, movimientos] = await Promise.all([
      Venta.countDocuments({ $or: [{ 'articulos.producto': product._id }, { producto: product._id }] }),
      Devolucion.countDocuments({ $or: [{ producto: product._id }, { productoCargar: product._id }] }),
      MovimientoStock.countDocuments({ producto: product._id }),
    ]);
    res.json({
      ...product.toJSON(),
      oferta: ofertaDeProducto(product, promociones),
      uso: { ventas, devoluciones, movimientos },
    });
  } catch (error) {
    next(error);
  }
};

export const crearProducto = async (req, res, next) => {
  try {
    const data = schemaCrearProducto.parse(req.body);
    const tienda = idTienda(req);

    if (data.variantes?.length > 0 && ((data.cantidad || 0) > 0 || (data.deposito || 0) > 0)) {
      return res.status(400).json({
        message: 'Cuando el producto tiene variantes, el stock se carga por variante (depósito). No envíes cantidad/depósito generales para no perder unidades.',
      });
    }

    const existing = await Producto.findOne(filtroTienda(req, {
      nombre: { $regex: `^${escaparRegex(data.nombre)}$`, $options: 'i' },
      enPapelera: { $ne: true },
    }));
    if (existing) {
      return res.status(409).json({ message: `Ya existe un producto llamado "${data.nombre}"` });
    }

    const codigoSolicitado = normalizarCodigo(data.codigo);
    let codigo;
    if (codigoSolicitado && CODIGO_INTERNO_REGEX.test(codigoSolicitado)) {
      const repetido = await buscarPorCodigoExacto(codigoSolicitado, tienda);
      if (!repetido) codigo = codigoSolicitado;
    }
    if (!codigo) codigo = await generarCodigoProducto(tienda);

    try {
      const product = await Producto.create({ ...data, codigo, ...datosTienda(req) });
      return res.status(201).json(product);
    } catch (error) {
      if (error?.code === 11000) {
        const alternativo = await generarCodigoProducto(tienda);
        const product = await Producto.create({ ...data, codigo: alternativo, ...datosTienda(req) });
        return res.status(201).json(product);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const actualizarProducto = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const data = schemaActualizarProducto.parse(req.body);
    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);

    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (data.nombre) {
      const existing = await Producto.findOne(filtroTienda(req, {
        nombre: { $regex: `^${escaparRegex(data.nombre)}$`, $options: 'i' },
        _id: { $ne: product._id },
        enPapelera: { $ne: true },
      })).session(session);
      if (existing) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Ya existe un producto llamado "${data.nombre}"` });
      }
    }

    const movimientos = [];
    const variantesPrevias = (product.variantes || []).map((v) => ({
      talle: v.talle || '',
      color: v.color || '',
      cantidad: v.cantidad || 0,
      deposito: v.deposito || 0,
      catalogo: v.catalogo || 0,
    }));

    if (data.variantes) {
      const faltantes = variantesPrevias.filter(
        (prev) =>
          (prev.cantidad > 0 || prev.deposito > 0 || prev.catalogo > 0) &&
          !data.variantes.some(
            (v) => claveVariante(v.talle, v.color) === claveVariante(prev.talle, prev.color)
          )
      );
      if (faltantes.length > 0) {
        const detalle = faltantes
          .map((v) => `${[v.talle, v.color].filter(Boolean).join(' / ') || 'Base'} (salón ${v.cantidad} · dep ${v.deposito} · cat ${v.catalogo})`)
          .join(', ');
        await session.abortTransaction();
        return res.status(409).json({
          message: `No se pueden quitar ni renombrar variantes con stock: ${detalle}. Pasá o ajustá el stock primero.`,
        });
      }

      if (data.variantes.length > 0) {
        if (variantesPrevias.length === 0 && ((product.cantidad || 0) > 0 || (product.deposito || 0) > 0 || (product.catalogo || 0) > 0)) {
          const detalle = [
            (product.cantidad || 0) > 0 ? `${product.cantidad} en salón` : null,
            (product.deposito || 0) > 0 ? `${product.deposito} en depósito` : null,
            (product.catalogo || 0) > 0 ? `${product.catalogo} en catálogo` : null,
          ]
            .filter(Boolean)
            .join(' y ');
          await session.abortTransaction();
          return res.status(409).json({
            message: `"${product.nombre}" tiene ${detalle} sin variante. Pasá o ajustá ese stock antes de agregar colores para no perder unidades.`,
          });
        }

        if (data.colores?.length) {
          const colorInvalido = data.variantes.find(
            (v) => v.color && !data.colores.includes(v.color)
          );
          if (colorInvalido) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `El color "${colorInvalido.color}" no está en la lista de colores del producto`,
            });
          }
        } else if (product.colores?.length) {
          const colorInvalido = data.variantes.find(
            (v) => v.color && !product.colores.includes(v.color)
          );
          if (colorInvalido) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `El color "${colorInvalido.color}" no está en la lista de colores del producto`,
            });
          }
        }

        delete data.deposito;
        delete data.catalogo;

        data.variantes = data.variantes.map((v) => {
          const idx = indiceDeVariante(product, v.talle, v.color);
          const depositoNuevo = Number(v.deposito) || 0;
          const prev = idx === -1 ? null : product.variantes[idx];
          const catalogoNuevo = v.catalogo === undefined
            ? (prev?.catalogo || 0)
            : (Number(v.catalogo) || 0);
          if (idx === -1) {
            if (depositoNuevo > 0) {
              movimientos.push({ talle: v.talle || '', color: v.color || '', tipo: 'ingreso_deposito', cantidad: depositoNuevo });
            }
            if (catalogoNuevo > 0) {
              movimientos.push({ talle: v.talle || '', color: v.color || '', tipo: 'ingreso_catalogo', cantidad: catalogoNuevo });
            }
            return { ...v, cantidad: 0, deposito: depositoNuevo, catalogo: catalogoNuevo };
          }
          const deltaDeposito = depositoNuevo - (prev.deposito || 0);
          if (deltaDeposito !== 0) {
            movimientos.push({ talle: v.talle || '', color: v.color || '', tipo: 'ajuste_deposito', cantidad: Math.abs(deltaDeposito) });
          }
          const deltaCatalogo = catalogoNuevo - (prev.catalogo || 0);
          if (deltaCatalogo !== 0) {
            movimientos.push({ talle: v.talle || '', color: v.color || '', tipo: 'ajuste_catalogo', cantidad: Math.abs(deltaCatalogo) });
          }
          return { ...v, cantidad: prev.cantidad || 0, deposito: depositoNuevo, catalogo: catalogoNuevo };
        });
      } else {
        if (data.deposito != null) {
          const depositoPrevio = variantesPrevias.length > 0
            ? variantesPrevias.reduce((s, v) => s + v.deposito, 0)
            : (product.deposito || 0);
          const depositoNuevo = Number(data.deposito) || 0;
          if (depositoPrevio !== depositoNuevo) {
            movimientos.push({ talle: '', color: '', tipo: 'ajuste_deposito', cantidad: Math.abs(depositoNuevo - depositoPrevio) });
          }
        }
        if (data.catalogo != null) {
          const catalogoPrevio = variantesPrevias.length > 0
            ? variantesPrevias.reduce((s, v) => s + v.catalogo, 0)
            : (product.catalogo || 0);
          const catalogoNuevo = Number(data.catalogo) || 0;
          if (catalogoPrevio !== catalogoNuevo) {
            movimientos.push({ talle: '', color: '', tipo: 'ajuste_catalogo', cantidad: Math.abs(catalogoNuevo - catalogoPrevio) });
          }
        }
        data.variantes = [];
      }
    } else if (data.deposito != null || data.catalogo != null) {
      if (variantesPrevias.length > 0) {
        delete data.deposito;
        delete data.catalogo;
      } else {
        if (data.deposito != null) {
          const delta = (Number(data.deposito) || 0) - (product.deposito || 0);
          if (delta !== 0) {
            movimientos.push({ talle: '', color: '', tipo: 'ajuste_deposito', cantidad: Math.abs(delta) });
          }
        }
        if (data.catalogo != null) {
          const delta = (Number(data.catalogo) || 0) - (product.catalogo || 0);
          if (delta !== 0) {
            movimientos.push({ talle: '', color: '', tipo: 'ajuste_catalogo', cantidad: Math.abs(delta) });
          }
        }
      }
    }

    if (data.variantes) {
      data.variantes = data.variantes.map((v) => {
        const idxPrevio = indiceDeVariante(product, v.talle, v.color);
        const codigoPrevio = idxPrevio === -1 ? null : product.variantes[idxPrevio]?.codigo;
        return codigoPrevio ? { ...v, codigo: codigoPrevio } : v;
      });
    }

    Object.assign(product, data);
    await product.save({ session });

    for (const movimiento of movimientos) {
      await registrarMovimiento({
        producto: product,
        ...movimiento,
        empleado: req.usuario?.nombre,
        tienda: idTienda(req),
      }, session);
    }

    await session.commitTransaction();
    res.json(product);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const aplicarAumentoMasivo = async (req, res, next) => {
  let session;
  try {
    const data = schemaAumentoPrecio.parse(req.body);
    const ids = [...new Set(data.productos.map((id) => String(id)))];

    session = await mongoose.startSession();
    session.startTransaction();

    const productos = await Producto.find(filtroTienda(req, {
      _id: { $in: ids },
      enPapelera: { $ne: true },
    })).session(session);

    if (productos.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Ninguno de los productos seleccionados está disponible (no existen o están en la papelera)',
      });
    }

    const items = [];
    const operaciones = [];
    for (const product of productos) {
      const centavosAnterior = aCentavos(product.precio);
      const centavosNuevo = data.tipo === 'porcentaje'
        ? Math.round(centavosAnterior * (1 + data.valor / 100))
        : centavosAnterior + aCentavos(data.valor);
      if (centavosNuevo === centavosAnterior) continue;
      items.push({
        producto: product._id,
        nombre: product.nombre,
        precioAnterior: deCentavos(centavosAnterior),
        precioNuevo: deCentavos(centavosNuevo),
      });
      operaciones.push({
        updateOne: {
          filter: { _id: product._id, enPapelera: { $ne: true } },
          update: { $set: { precio: deCentavos(centavosNuevo) } },
        },
      });
    }

    if (items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'El aumento no modifica el precio de los productos seleccionados',
      });
    }

    await Producto.bulkWrite(operaciones, { session });
    const [aumento] = await AumentoPrecio.create(
      [{
        tipo: data.tipo,
        valor: data.valor,
        cantidad: items.length,
        items,
        creadoPor: req.usuario?.nombre || '',
        ...datosTienda(req),
      }],
      { session }
    );

    await session.commitTransaction();

    const omitidos = ids.length - productos.length;
    const sinCambios = productos.length - items.length;
    const detalles = [];
    if (omitidos > 0) detalles.push(`${omitidos} quedaron fuera (no existen o están en la papelera)`);
    if (sinCambios > 0) detalles.push(`${sinCambios} sin cambios de precio`);

    res.json({
      message: `Precios actualizados en ${items.length} producto(s)${detalles.length > 0 ? `. ${detalles.join('; ')}` : ''}`,
      cantidad: items.length,
      omitidos,
      sinCambios,
      aumento,
    });
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const obtenerAumentos = async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const aumentos = await AumentoPrecio.find(filtroTienda(req))
      .select('-items')
      .sort({ fechaCreacion: -1 })
      .limit(limite);
    res.json(aumentos);
  } catch (error) {
    next(error);
  }
};

export const deshacerAumento = async (req, res, next) => {
  let session;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Aumento inválido' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const aumento = await AumentoPrecio.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!aumento) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Aumento no encontrado' });
    }
    if (aumento.deshecho) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'Este aumento ya fue deshecho' });
    }

    const ids = aumento.items.map((item) => item.producto);
    const productos = await Producto.find(filtroTienda(req, {
      _id: { $in: ids },
      enPapelera: { $ne: true },
    })).session(session);
    const porId = new Map(productos.map((product) => [String(product._id), product]));

    const operaciones = [];
    let omitidos = 0;
    for (const item of aumento.items) {
      const product = porId.get(String(item.producto));
      if (!product || aCentavos(product.precio) !== aCentavos(item.precioNuevo)) {
        omitidos += 1;
        continue;
      }
      operaciones.push({
        updateOne: {
          filter: { _id: product._id, ...filtroTienda(req), enPapelera: { $ne: true } },
          update: { $set: { precio: item.precioAnterior } },
        },
      });
    }

    if (operaciones.length === 0) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'No se pudo deshacer: los precios de esos productos ya cambiaron después del aumento',
        code: 'PRECIOS_CAMBIADOS',
      });
    }

    await Producto.bulkWrite(operaciones, { session });
    aumento.deshecho = true;
    aumento.deshechoPor = req.usuario?.nombre || '';
    aumento.deshechoEn = new Date();
    await aumento.save({ session });

    await session.commitTransaction();

    res.json({
      message: omitidos > 0
        ? `Se restauraron ${operaciones.length} precio(s). ${omitidos} producto(s) no se tocaron porque su precio cambió después.`
        : `Se restauraron ${operaciones.length} precio(s)`,
      cantidad: operaciones.length,
      omitidos,
    });
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const agregarStock = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color } = schemaAgregarStock.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (rechazarSiEnPapelera(res, product)) {
      await session.abortTransaction();
      return;
    }

    if (product.variantes?.length > 0) {
      const idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        product.variantes.push({ talle: talle || '', color: color || '', cantidad });
      } else {
        product.variantes[idx].cantidad += cantidad;
      }
    } else {
      product.cantidad += cantidad;
    }

    await product.save({ session });

    await registrarMovimiento({
      producto: product,
      talle,
      color,
      tipo: 'ajuste_salon',
      cantidad,
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(product);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const agregarDeposito = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color, modo } = schemaDeposito.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (rechazarSiEnPapelera(res, product)) {
      await session.abortTransaction();
      return;
    }

    let delta;
    if (product.variantes?.length > 0) {
      let idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        product.variantes.push({ talle: talle || '', color: color || '', cantidad: 0, deposito: 0 });
        idx = product.variantes.length - 1;
      }
      const actual = product.variantes[idx].deposito || 0;
      const nuevo = modo === 'fijar' ? cantidad : actual + cantidad;
      delta = nuevo - actual;
      product.variantes[idx].deposito = nuevo;
    } else {
      const actual = product.deposito || 0;
      const nuevo = modo === 'fijar' ? cantidad : actual + cantidad;
      delta = nuevo - actual;
      product.deposito = nuevo;
    }

    if (delta === 0) {
      await session.abortTransaction();
      return res.json(product);
    }

    await product.save({ session });

    await registrarMovimiento({
      producto: product,
      talle,
      color,
      tipo: modo === 'fijar' ? 'ajuste_deposito' : 'ingreso_deposito',
      cantidad: Math.abs(delta),
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(product);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const agregarCatalogo = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color, modo } = schemaCatalogo.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    let delta;
    if (product.variantes?.length > 0) {
      let idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        product.variantes.push({ talle: talle || '', color: color || '', cantidad: 0, deposito: 0, catalogo: 0 });
        idx = product.variantes.length - 1;
      }
      const actual = product.variantes[idx].catalogo || 0;
      const nuevo = modo === 'fijar' ? cantidad : actual + cantidad;
      delta = nuevo - actual;
      product.variantes[idx].catalogo = nuevo;
    } else {
      const actual = product.catalogo || 0;
      const nuevo = modo === 'fijar' ? cantidad : actual + cantidad;
      delta = nuevo - actual;
      product.catalogo = nuevo;
    }

    if (delta === 0) {
      await session.abortTransaction();
      return res.json(product);
    }

    await product.save({ session });

    await registrarMovimiento({
      producto: product,
      talle,
      color,
      tipo: modo === 'fijar' ? 'ajuste_catalogo' : 'ingreso_catalogo',
      cantidad: Math.abs(delta),
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(product);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const reponerStock = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color } = schemaMovimientoStock.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (rechazarSiEnPapelera(res, product)) {
      await session.abortTransaction();
      return;
    }

    const disponible = depositoDe(product, talle, color);
    let actualizado;

    if (product.variantes?.length > 0) {
      const idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Variante no encontrada en "${product.nombre}"` });
      }
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En depósito solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      const variante = product.variantes[idx];
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, {
          _id: product._id,
          variantes: { $elemMatch: { talle: variante.talle || '', color: variante.color || '', deposito: { $gte: cantidad } } },
        }),
        { $inc: { 'variantes.$.deposito': -cantidad, 'variantes.$.cantidad': cantidad, cantidad } },
        { new: true, session }
      );
    } else {
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En depósito solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, { _id: product._id, deposito: { $gte: cantidad } }),
        { $inc: { deposito: -cantidad, cantidad } },
        { new: true, session }
      );
    }

    if (!actualizado) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `En depósito solo hay ${disponible} unidad(es) de "${product.nombre}".`,
      });
    }

    await registrarMovimiento({
      producto: actualizado,
      talle,
      color,
      tipo: 'reposicion',
      cantidad,
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(actualizado);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const pasarAlSalon = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { articulos } = schemaPasarSalon.parse(req.body);

    const ids = [...new Set(articulos.map((i) => String(i.producto)))];
    const productos = await Producto.find({ _id: { $in: ids }, ...filtroTienda(req) }).session(session);
    const porId = new Map(productos.map((p) => [String(p._id), p]));
    const movimientos = [];

    for (const item of articulos) {
      const product = porId.get(String(item.producto));
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Producto ${item.producto} no encontrado` });
      }
      if (rechazarSiEnPapelera(res, product)) {
        await session.abortTransaction();
        return;
      }
      const disponible = depositoDe(product, item.talle, item.color);
      if (disponible < item.cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En depósito solo hay ${disponible} unidad(es) de "${product.nombre}". No se movió nada.`,
        });
      }
      if (product.variantes?.length > 0) {
        const idx = indiceDeVariante(product, item.talle, item.color);
        if (idx === -1) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Variante no encontrada en "${product.nombre}"` });
        }
        product.variantes[idx].deposito -= item.cantidad;
        product.variantes[idx].cantidad += item.cantidad;
      } else {
        product.deposito -= item.cantidad;
        product.cantidad += item.cantidad;
      }
      movimientos.push({ producto: product, talle: item.talle, color: item.color, cantidad: item.cantidad });
    }

    for (const product of porId.values()) {
      await product.save({ session });
    }
    for (const movimiento of movimientos) {
      await registrarMovimiento({
        producto: movimiento.producto,
        talle: movimiento.talle,
        color: movimiento.color,
        tipo: 'reposicion',
        cantidad: movimiento.cantidad,
        empleado: req.usuario?.nombre,
        tienda: idTienda(req),
      }, session);
    }

    await session.commitTransaction();
    res.json({ message: 'Stock pasado al salón' });
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const pasarAlCatalogo = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { articulos } = schemaPasarSalon.parse(req.body);

    const ids = [...new Set(articulos.map((i) => String(i.producto)))];
    const productos = await Producto.find({ _id: { $in: ids }, ...filtroTienda(req) }).session(session);
    const porId = new Map(productos.map((p) => [String(p._id), p]));
    const movimientos = [];

    for (const item of articulos) {
      const product = porId.get(String(item.producto));
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Producto ${item.producto} no encontrado` });
      }
      const disponible = depositoDe(product, item.talle, item.color);
      if (disponible < item.cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En depósito solo hay ${disponible} unidad(es) de "${product.nombre}". No se movió nada.`,
        });
      }
      if (product.variantes?.length > 0) {
        const idx = indiceDeVariante(product, item.talle, item.color);
        if (idx === -1) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Variante no encontrada en "${product.nombre}"` });
        }
        product.variantes[idx].deposito -= item.cantidad;
        product.variantes[idx].catalogo = (product.variantes[idx].catalogo || 0) + item.cantidad;
      } else {
        product.deposito -= item.cantidad;
        product.catalogo = (product.catalogo || 0) + item.cantidad;
      }
      movimientos.push({ producto: product, talle: item.talle, color: item.color, cantidad: item.cantidad });
    }

    for (const product of porId.values()) {
      await product.save({ session });
    }
    for (const movimiento of movimientos) {
      await registrarMovimiento({
        producto: movimiento.producto,
        talle: movimiento.talle,
        color: movimiento.color,
        tipo: 'reposicion_catalogo',
        cantidad: movimiento.cantidad,
        empleado: req.usuario?.nombre,
        tienda: idTienda(req),
      }, session);
    }

    await session.commitTransaction();
    res.json({ message: 'Stock pasado al catálogo' });
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const retirarStock = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color } = schemaMovimientoStock.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (rechazarSiEnPapelera(res, product)) {
      await session.abortTransaction();
      return;
    }

    const disponible = product.variantes?.length > 0
      ? (() => {
          const idx = indiceDeVariante(product, talle, color);
          return idx === -1 ? 0 : (product.variantes[idx].cantidad || 0);
        })()
      : (product.cantidad || 0);

    let actualizado;

    if (product.variantes?.length > 0) {
      const idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Variante no encontrada en "${product.nombre}"` });
      }
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En salón solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      const variante = product.variantes[idx];
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, {
          _id: product._id,
          variantes: { $elemMatch: { talle: variante.talle || '', color: variante.color || '', cantidad: { $gte: cantidad } } },
        }),
        { $inc: { 'variantes.$.deposito': cantidad, 'variantes.$.cantidad': -cantidad, cantidad: -cantidad } },
        { new: true, session }
      );
    } else {
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En salón solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, { _id: product._id, cantidad: { $gte: cantidad } }),
        { $inc: { deposito: cantidad, cantidad: -cantidad } },
        { new: true, session }
      );
    }

    if (!actualizado) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `En salón solo hay ${disponible} unidad(es) de "${product.nombre}".`,
      });
    }

    await registrarMovimiento({
      producto: actualizado,
      talle,
      color,
      tipo: 'retiro_deposito',
      cantidad,
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(actualizado);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const retirarDelCatalogo = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { cantidad, talle, color } = schemaMovimientoStock.parse(req.body);

    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const disponible = catalogoDe(product, talle, color);
    let actualizado;

    if (product.variantes?.length > 0) {
      const idx = indiceDeVariante(product, talle, color);
      if (idx === -1) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Variante no encontrada en "${product.nombre}"` });
      }
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En catálogo solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      const variante = product.variantes[idx];
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, {
          _id: product._id,
          variantes: { $elemMatch: { talle: variante.talle || '', color: variante.color || '', catalogo: { $gte: cantidad } } },
        }),
        { $inc: { 'variantes.$.deposito': cantidad, 'variantes.$.catalogo': -cantidad, catalogo: -cantidad } },
        { new: true, session }
      );
    } else {
      if (disponible < cantidad) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `En catálogo solo hay ${disponible} unidad(es) de "${product.nombre}".`,
        });
      }
      actualizado = await Producto.findOneAndUpdate(
        filtroTienda(req, { _id: product._id, catalogo: { $gte: cantidad } }),
        { $inc: { deposito: cantidad, catalogo: -cantidad } },
        { new: true, session }
      );
    }

    if (!actualizado) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `En catálogo solo hay ${disponible} unidad(es) de "${product.nombre}".`,
      });
    }

    await registrarMovimiento({
      producto: actualizado,
      talle,
      color,
      tipo: 'retiro_catalogo',
      cantidad,
      empleado: req.usuario?.nombre,
      tienda: idTienda(req),
    }, session);

    await session.commitTransaction();
    res.json(actualizado);
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const intercambiarProducto = async (req, res, next) => {
  try {
    const data = schemaIntercambio.parse(req.body);
    const resultado = await conReintentos(() => ejecutarCambio(data, req.usuario));

    void enviarEvento({
      tipo: 'devolucion',
      titulo: 'Cambio registrado',
      mensaje: `${resultado.productoDevuelto.nombre} → ${resultado.productoCargado.nombre}`,
      url: '/returns',
      tienda: idTienda(req),
      para: 'admins',
    });
    void enviarStockBajo([resultado.productoCargado], idTienda(req));

    res.json({
      message: resultado.diferencia > 0
        ? `Cambio registrado. Diferencia a cobrar: $${resultado.diferencia.toFixed(2)}`
        : resultado.diferencia < 0
          ? `Cambio registrado. Diferencia a favor del cliente: $${Math.abs(resultado.diferencia).toFixed(2)}`
          : 'Cambio registrado correctamente',
      productoDevuelto: resultado.productoDevuelto,
      productoCargado: resultado.productoCargado,
      diferencia: resultado.diferencia,
      ventaDiferenciaId: resultado.ventaDiferencia?._id || null,
      ticketDiferencia: resultado.ventaDiferencia?.ticketNumero || null,
    });
  } catch (error) {
    responderErrorDeServicio(error, res, next);
  }
};

export const eliminarProducto = async (req, res, next) => {
  try {
    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (product.enPapelera) {
      return res.status(409).json({ message: `"${product.nombre}" ya está en la papelera` });
    }
    product.enPapelera = true;
    product.eliminadoEn = new Date();
    product.eliminadoPor = req.usuario?.nombre || '';
    await product.save();
    res.json({ message: `"${product.nombre}" se movió a la papelera`, producto: product });
  } catch (error) {
    next(error);
  }
};

export const restaurarProducto = async (req, res, next) => {
  try {
    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (!product.enPapelera) {
      return res.status(409).json({ message: `"${product.nombre}" no está en la papelera` });
    }
    const repetido = await Producto.findOne(filtroTienda(req, {
      nombre: { $regex: `^${escaparRegex(product.nombre)}$`, $options: 'i' },
      _id: { $ne: product._id },
      enPapelera: { $ne: true },
    }));
    if (repetido) {
      return res.status(409).json({
        message: `Ya existe un producto activo llamado "${product.nombre}". Renombralo antes de restaurar este producto.`,
        code: 'NOMBRE_EN_USO',
      });
    }
    product.enPapelera = false;
    product.eliminadoEn = null;
    product.eliminadoPor = '';
    await product.save();
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const eliminarDefinitivo = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const product = await Producto.findOne({ _id: req.params.id, ...filtroTienda(req) }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    if (!product.enPapelera) {
      await session.abortTransaction();
      return res.status(409).json({
        message: `"${product.nombre}" no está en la papelera. Primero eliminá el producto para poder borrarlo definitivamente.`,
        code: 'NO_EN_PAPELERA',
      });
    }
    await Producto.findOneAndDelete({ _id: product._id, ...filtroTienda(req) }).session(session);
    await Promocion.updateMany(
      { productos: product._id },
      { $pull: { productos: product._id } }
    ).session(session);
    await session.commitTransaction();
    res.json({ message: `"${product.nombre}" se eliminó definitivamente` });
  } catch (error) {
    await session?.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session?.endSession();
  }
};

export const obtenerEstadisticasTablero = async (req, res, next) => {
  try {
    const totalProductos = await Producto.countDocuments(filtroTienda(req, { enPapelera: { $ne: true } }));
    const totalCategorias = await Producto.distinct('categoria', filtroTienda(req, { enPapelera: { $ne: true } })).then((cats) => cats.length);
    const totalProveedores = await Proveedor.countDocuments(filtroTienda(req));
    const totalDevoluciones = await Devolucion.countDocuments(filtroTienda(req));

    res.json({
      totalProductos,
      totalCategorias,
      totalProveedores,
      totalDevoluciones,
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerStockBajo = async (req, res, next) => {
  try {
    const products = await Producto.find(filtroTienda(req, { enPapelera: { $ne: true } }));

    const lowStock = [];
    for (const product of products) {
      const stockMinimo = product.stockMinimo ?? 0;
      if (product.variantes?.length > 0) {
        for (const v of product.variantes) {
          if (v.cantidad <= stockMinimo) {
            lowStock.push({
              productoId: product._id,
              productoNombre: product.nombre,
              talle: v.talle,
              color: v.color,
              cantidad: v.cantidad,
              deposito: v.deposito || 0,
              stockMinimo,
            });
          }
        }
      } else if (product.cantidad <= stockMinimo) {
        lowStock.push({
          productoId: product._id,
          productoNombre: product.nombre,
          talle: '',
          color: '',
          cantidad: product.cantidad,
          deposito: product.deposito || 0,
          stockMinimo,
        });
      }
    }

    res.json(lowStock.sort((a, b) => a.cantidad - b.cantidad));
  } catch (error) {
    next(error);
  }
};