import Pedido from './PedidoModel.js';
import Producto from '../Producto/ProductoModel.js';
import { schemaEstadoPedido } from './PedidoSchema.js';
import { filtroTienda } from '../../utils/TenantUtils.js';
import { obtenerRango } from '../../utils/FechasUtils.js';

export const obtenerPedidos = async (req, res, next) => {
  try {
    const { estado, desde, hasta, offset = 0, limit = 200 } = req.query;
    const filtro = filtroTienda(req);

    if (estado) filtro.estado = estado;
    if (desde || hasta) filtro.fechaCreacion = obtenerRango(desde, hasta, offset);

    const limite = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const pedidos = await Pedido.find(filtro).sort({ fechaCreacion: -1 }).limit(limite);

    res.json(pedidos);
  } catch (error) {
    next(error);
  }
};

export const cambiarEstadoPedido = async (req, res, next) => {
  try {
    const { estado } = schemaEstadoPedido.parse(req.body);

    const pedido = await Pedido.findOne(filtroTienda(req, { _id: req.params.id }));
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (estado === 'cancelado' && pedido.estado !== 'cancelado' && pedido.stockDescontado) {
      for (const item of pedido.items) {
        if (item.conVariante) {
          await Producto.updateOne(
            filtroTienda(req, {
              _id: item.producto,
              variantes: { $elemMatch: { talle: item.talle || '', color: item.color || '' } },
            }),
            { $inc: { 'variantes.$.catalogo': item.cantidad, catalogo: item.cantidad } }
          );
        } else {
          await Producto.updateOne(
            filtroTienda(req, { _id: item.producto }),
            { $inc: { catalogo: item.cantidad } }
          );
        }
      }
      pedido.stockDescontado = false;
    }

    pedido.estado = estado;
    pedido.historial.push({ estado, usuario: req.usuario?.nombre || '' });
    await pedido.save();

    res.json(pedido);
  } catch (error) {
    next(error);
  }
};
