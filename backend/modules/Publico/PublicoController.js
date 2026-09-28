import mongoose from 'mongoose';
import Producto from '../Producto/ProductoModel.js';
import Pedido from '../Pedido/PedidoModel.js';
import Contador from '../Venta/ContadorModel.js';
import { schemaPedidoPublico } from '../Pedido/PedidoSchema.js';
import { enviarEvento } from '../../services/PushService.js';
import { indiceDeVariante } from '../../utils/VariantesUtils.js';

const escaparRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const redondear = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

const siguienteNumeroPedido = async (tiendaId) => {
  const contador = await Contador.findByIdAndUpdate(
    `pedido:${tiendaId}`,
    { $inc: { secuencia: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return contador.secuencia;
};

const disponibleDe = (producto, talle, color) => {
  if (producto.variantes?.length > 0) {
    const idx = indiceDeVariante(producto, talle, color);
    return idx === -1 ? 0 : (producto.variantes[idx].cantidad || 0);
  }
  return producto.cantidad || 0;
};

export const obtenerTiendaPublica = (req, res) => {
  const { nombre, slug, whatsapp, telefono, email, modoVenta, tema } = req.tienda;
  res.json({ nombre, slug, whatsapp, telefono, email, modoVenta, tema });
};

export const obtenerProductosPublicos = async (req, res, next) => {
  try {
    const { search, categoria } = req.query;
    const filtro = { tienda: req.tienda._id };

    const termino = String(search || '').trim();
    if (termino) {
      const safe = escaparRegex(termino);
      filtro.$or = [
        { nombre: { $regex: safe, $options: 'i' } },
        { categoria: { $regex: safe, $options: 'i' } },
      ];
    }

    const categoriaFiltro = String(categoria || '').trim();
    if (categoriaFiltro) {
      filtro.categoria = { $regex: `^${escaparRegex(categoriaFiltro)}$`, $options: 'i' };
    }

    const limite = Math.min(Math.max(Number(req.query.limit) || 500, 1), 500);
    const productos = await Producto.find(filtro)
      .select('nombre precio categoria colores variantes cantidad deposito')
      .sort({ nombre: 1 })
      .limit(limite);

    res.json(productos);
  } catch (error) {
    next(error);
  }
};

export const obtenerCategoriasPublicas = async (req, res, next) => {
  try {
    const categorias = await Producto.aggregate([
      {
        $match: {
          tienda: new mongoose.Types.ObjectId(String(req.tienda._id)),
          categoria: { $nin: [null, ''] },
        },
      },
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

export const crearPedidoPublico = async (req, res, next) => {
  try {
    const data = schemaPedidoPublico.parse(req.body);
    const tienda = req.tienda;

    const ids = [...new Set(data.items.map((item) => item.producto))];
    const productos = await Producto.find({ tienda: tienda._id, _id: { $in: ids } });
    const porId = new Map(productos.map((producto) => [String(producto._id), producto]));

    const items = [];
    let total = 0;

    for (const item of data.items) {
      const producto = porId.get(String(item.producto));
      if (!producto) {
        return res.status(400).json({
          message: 'Uno de los productos ya no está disponible',
          codigo: 'PRODUCTO_NO_DISPONIBLE',
        });
      }

      if (disponibleDe(producto, item.talle, item.color) < item.cantidad) {
        return res.status(400).json({
          message: `No hay stock suficiente de "${producto.nombre}"`,
          codigo: 'SIN_STOCK',
        });
      }

      const precio = redondear(producto.precio || 0);
      const subtotal = redondear(precio * item.cantidad);
      total = redondear(total + subtotal);
      items.push({
        producto: producto._id,
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precio,
        talle: item.talle || '',
        color: item.color || '',
        subtotal,
      });
    }

    const numero = await siguienteNumeroPedido(tienda._id);
    const pedido = await Pedido.create({
      tienda: tienda._id,
      numero,
      cliente: data.cliente,
      items,
      total,
      metodoPago: data.metodoPago,
      historial: [{ estado: 'pendiente', usuario: 'catálogo' }],
    });

    const resumen = items
      .map((item) => {
        const variante = [item.talle, item.color].filter(Boolean).join(' / ');
        return `${item.cantidad}x ${item.nombre}${variante ? ` (${variante})` : ''}`;
      })
      .join(', ');

    void enviarEvento({
      tipo: 'pedido',
      titulo: 'Nuevo pedido online',
      mensaje: `#${numero} · ${resumen} · $${Number(total).toLocaleString('es-AR')}`,
      url: '/pedidos',
      tienda: String(tienda._id),
      para: 'admins',
    });

    const texto = encodeURIComponent(
      `¡Hola! Quiero coordinar el pedido #${numero} de ${tienda.nombre}: ${resumen}. Total: $${Number(total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    );
    const whatsapp = tienda.whatsapp
      ? `https://wa.me/${String(tienda.whatsapp).replace(/\D/g, '')}?text=${texto}`
      : null;

    res.status(201).json({ pedido, whatsapp });
  } catch (error) {
    next(error);
  }
};
