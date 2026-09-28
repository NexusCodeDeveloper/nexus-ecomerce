import mongoose from 'mongoose';
import { campoCentavosPositivo } from '../../utils/DineroUtils.js';

const pagoSchema = new mongoose.Schema(
  {
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
      required: true,
      index: true,
    },
    monto: {
      ...campoCentavosPositivo,
      required: true,
    },
    moneda: {
      type: String,
      trim: true,
      default: 'ARS',
    },
    metodo: {
      type: String,
      enum: ['transferencia', 'mercadopago', 'efectivo', 'otro'],
      default: 'transferencia',
    },
    periodoDesde: {
      type: Date,
    },
    periodoHasta: {
      type: Date,
    },
    nota: {
      type: String,
      trim: true,
      default: '',
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' }, toJSON: { getters: true } }
);

pagoSchema.index({ tienda: 1, fechaCreacion: -1 });

export default mongoose.model('Pago', pagoSchema, 'pagos');
