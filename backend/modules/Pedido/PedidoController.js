import Pedido from './PedidoModel.js';
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

    const pedido = await Pedido.findOneAndUpdate(
      filtroTienda(req, { _id: req.params.id }),
      {
        $set: { estado },
        $push: { historial: { estado, usuario: req.usuario?.nombre || '' } },
      },
      { new: true }
    );

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json(pedido);
  } catch (error) {
    next(error);
  }
};
