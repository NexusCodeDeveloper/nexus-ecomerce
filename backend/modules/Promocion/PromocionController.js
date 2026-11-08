import mongoose from 'mongoose';
import Promocion from './PromocionModel.js';
import Producto from '../Producto/ProductoModel.js';
import { schemaCrearPromocion } from './PromocionSchema.js';
import { verificarSuperposicion } from './PromocionService.js';
import { estadoDePromocion, precioConPromocion, promocionVigente } from '../../utils/PreciosUtils.js';
import { aCentavos, deCentavos } from '../../utils/DineroUtils.js';
import { filtroTienda, datosTienda, idTienda } from '../../utils/TenantUtils.js';

const contarActivosPorPromocion = async (promos, tienda) => {
  const cantidades = new Map();
  const conLista = promos.filter((promo) => !promo.todos);
  const idsLista = [...new Set(
    conLista.flatMap((promo) => (promo.productos || []).map((id) => String(id)))
  )].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const filtroProducto = tienda ? { tienda } : {};
    const [todosActivos, activos] = await Promise.all([
      promos.some((promo) => promo.todos)
        ? Producto.countDocuments({ ...filtroProducto, enPapelera: { $ne: true } })
        : 0,
      idsLista.length > 0
        ? Producto.find({ ...filtroProducto, _id: { $in: idsLista }, enPapelera: { $ne: true } }).select('_id').lean()
        : [],
    ]);
  const activosSet = new Set(activos.map((doc) => String(doc._id)));
  for (const promo of conLista) {
    cantidades.set(
      String(promo._id),
      (promo.productos || []).filter((id) => activosSet.has(String(id))).length
    );
  }
  for (const promo of promos.filter((p) => p.todos)) {
    cantidades.set(String(promo._id), todosActivos);
  }
  return cantidades;
};

const serializarPromocion = (promo, cantidadActivos, ahora = new Date()) => ({
  ...promo.toJSON(),
  estado: estadoDePromocion(promo, ahora),
  cantidadProductos: promo.todos ? null : cantidadActivos,
});

const serializarPromociones = async (promos, ahora = new Date(), tienda) => {
  const cantidades = await contarActivosPorPromocion(promos, tienda);
  return promos.map((promo) => serializarPromocion(promo, cantidades.get(String(promo._id)) || 0, ahora));
};

export const obtenerPromociones = async (req, res, next) => {
  try {
    const tienda = idTienda(req);
    const promociones = await Promocion.find({ ...filtroTienda(req) }).sort({ desde: -1 }).limit(200);
    res.json(await serializarPromociones(promociones, new Date(), tienda));
  } catch (error) {
    next(error);
  }
};

/** Listado liviano para el banner de cronómetro: activas y programadas, visible para todos. */
export const obtenerPromocionesVigentes = async (req, res, next) => {
  try {
    const ahora = new Date();
    const tienda = idTienda(req);
    const promociones = await Promocion.find({ ...filtroTienda(req), activa: true, hasta: { $gte: ahora } }).sort({
      hasta: 1,
    });
    const cantidades = await contarActivosPorPromocion(promociones, tienda);
    res.json({
      ahora,
      promociones: promociones.map((promo) => ({
        _id: promo._id,
        nombre: promo.nombre || '',
        tipo: promo.tipo,
        valor: promo.valor,
        desde: promo.desde,
        hasta: promo.hasta,
        todos: promo.todos,
        cantidadProductos: promo.todos ? null : cantidades.get(String(promo._id)) || 0,
        estado: estadoDePromocion(promo, ahora),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** Productos que entran en una promoción vigente, para el cajón del banner. */
export const obtenerProductosDePromocion = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    const ahora = new Date();
    const tienda = idTienda(req);
    const promo = await Promocion.findOne({
      _id: req.params.id,
      ...filtroTienda(req),
      activa: true,
      hasta: { $gte: ahora },
    });
    if (!promo) {
      return res.status(404).json({ message: 'Promoción no encontrada o vencida' });
    }

    const filtroProducto = { ...filtroTienda(req), enPapelera: { $ne: true } };
    const filter = promo.todos ? filtroProducto : { ...filtroProducto, _id: { $in: promo.productos } };
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const limite = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 2000);

    const [productos, total] = await Promise.all([
      Producto.find(filter).sort({ nombre: 1, _id: 1 }).skip(offset).limit(limite),
      Producto.countDocuments(filter),
    ]);

    res.json({
      total,
      vigente: promocionVigente(promo, ahora),
      productos: productos.map((producto) => ({
        _id: producto._id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: producto.cantidad,
        categoria: producto.categoria,
        precioOferta: deCentavos(precioConPromocion(aCentavos(producto.precio), promo)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const crearPromocion = async (req, res, next) => {
  try {
    const data = schemaCrearPromocion.parse(req.body);
    const desde = new Date(data.desde);
    const hasta = new Date(data.hasta);

    const tienda = idTienda(req);
    await verificarSuperposicion({ desde, hasta, todos: data.todos, productos: data.productos, tienda });

    const promo = await Promocion.create({
      nombre: data.nombre,
      tipo: data.tipo,
      valor: data.valor,
      desde,
      hasta,
      todos: data.todos,
      productos: data.todos ? [] : data.productos,
      activa: true,
      creadoPor: req.usuario?.nombre || '',
      ...datosTienda(req),
    });

    const [serializada] = await serializarPromociones([promo], new Date(), tienda);
    res.status(201).json(serializada);
  } catch (error) {
    next(error);
  }
};

export const cancelarPromocion = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Promoción inválida' });
    }
    const promo = await Promocion.findOneAndUpdate(
      { _id: req.params.id, ...filtroTienda(req) },
      { $set: { activa: false } },
      { new: true }
    );
    if (!promo) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    const [serializada] = await serializarPromociones([promo]);
    res.json(serializada);
  } catch (error) {
    next(error);
  }
};

export const eliminarPromocion = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Promoción inválida' });
    }
    const promo = await Promocion.findOneAndDelete({ _id: req.params.id, ...filtroTienda(req) });
    if (!promo) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    res.json({ message: 'Promoción eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};
