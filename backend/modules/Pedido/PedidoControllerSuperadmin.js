import Pedido from './PedidoModel.js';
import Producto from '../Producto/ProductoModel.js';
import { schemaEstadoPedido } from './PedidoSchema.js';
import { obtenerRango } from '../../utils/FechasUtils.js';

export const obtenerPedidosSuperadmin = async (req, res, next) => {
  try {
    const { estado, tienda, desde, hasta, offset = 0, limit = 200 } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado;
    if (tienda) filtro.tienda = tienda;
    if (desde || hasta) filtro.fechaCreacion = obtenerRango(desde, hasta, 0);

    const limite = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const pedidos = await Pedido.find(filtro)
      .sort({ fechaCreacion: -1 })
      .limit(limite)
      .populate('tienda', 'nombre slug');

    res.json(pedidos);
  } catch (error) {
    next(error);
  }
};

export const cambiarEstadoPedidoSuperadmin = async (req, res, next) => {
  try {
    const { estado } = req.body;

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (estado === 'cancelado' && req.body.estado !== 'cancelado' && req.body.stockDescontado) {
      // Restaurar stock de catálogo si se cancela
      for (const item of req.body.items) {
        if (item.conVariante) {
          await require('../Producto/ProductoModel.js').updateOne(
            { _id: item.producto },
            { $inc: { 'variantes.$.catalogo': item.cantidad, catalogo: item.cantidad } }
          );
        } else {
          await require('../Producto/ProductoModel.js').updateOne(
            { _id: item.producto },
            { $inc: { catalogo: item.cantidad } }
          );
        }
      }
      req.body.stockDescontado = false;
    }

    req.body.estado = estado;
    req.body.historial = { estado, usuario: req.usuario?.nombre || '' };
    
    const pedido = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json(req.body);
  } catch (error) {
    next(error);
  }
};

export const obtenerPedidosSuperadmin = async (req, res, next) => {
  try {
    const { estado, tienda, desde, hasta, offset = 0, limit = 200 } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado;
    if (tienda) filtro.tienda = tienda;
    if (desde || hasta) filtro.fechaCreacion = obtenerRango(desde, hasta, 0);

    const limite = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const pedidos = await Pedido.find(filtro)
      .sort({ fechaCreacion: -1 })
      .limit(limite)
      .populate('tienda', 'nombre slug');

    res.json(pedidos);
  } catch (error) {
    next(error);
  }
};

export const cambiarEstadoPedidoSuperadmin = async (req, res, next) => {
  try {
    const { estado } = req.body;

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (estado === 'cancelado' && req.body.estado !== 'cancelado' && req.body.stockDescontado) {
      // Restaurar stock de catálogo si se cancela
      for (const item of req.body.items) {
        if (item.conVariante) {
          await require('../Producto/ProductoModel.js').updateOne(
            { _id: item.producto },
            { $inc: { 'variantes.$.catalogo': item.cantidad, catalogo: item.cantidad } }
          );
        } else {
          await require('../Producto/ProductoModel.js').updateOne(
            { _id: item.producto },
            { $inc: { catalogo: item.cantidad } }
          );
        }
      }
      req.body.stockDescontado = false;
    }

    req.body.estado = estado;
    req.body.historial = { estado, usuario: req.usuario?.nombre || '' };
    
    const pedido = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json(req.body);
  } catch (error) {
    next(error);
  }
};