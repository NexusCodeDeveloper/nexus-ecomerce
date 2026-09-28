import mongoose from 'mongoose';
import { campoCentavosPositivo } from '../../utils/DineroUtils.js';

export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

const itemSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre: { type: String, trim: true, default: '' },
    cantidad: { type: Number, required: true, min: 1 },
    precio: { ...campoCentavosPositivo, required: true },
    talle: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    subtotal: { ...campoCentavosPositivo, required: true },
  },
  { _id: false }
);

const pedidoSchema = new mongoose.Schema(
  {
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
      required: true,
    },
    numero: {
      type: Number,
    },
    cliente: {
      nombre: { type: String, trim: true, required: true },
      telefono: { type: String, trim: true, required: true },
      email: { type: String, trim: true, lowercase: true, default: '' },
      direccion: { type: String, trim: true, default: '' },
      nota: { type: String, trim: true, default: '' },
    },
    items: { type: [itemSchema], default: [] },
    total: { ...campoCentavosPositivo, required: true },
    estado: { type: String, enum: ESTADOS_PEDIDO, default: 'pendiente' },
    metodoPago: { type: String, enum: ['transferencia', 'mercadopago', 'efectivo'], default: 'transferencia' },
    historial: [{
      estado: { type: String, enum: ESTADOS_PEDIDO },
      fecha: { type: Date, default: Date.now },
      usuario: { type: String, trim: true, default: '' },
    }],
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' }, toJSON: { getters: true } }
);

pedidoSchema.index({ tienda: 1, fechaCreacion: -1 });
pedidoSchema.index({ tienda: 1, estado: 1 });
pedidoSchema.index({ tienda: 1, numero: 1 }, { unique: true, sparse: true });

export default mongoose.model('Pedido', pedidoSchema, 'pedidos');
