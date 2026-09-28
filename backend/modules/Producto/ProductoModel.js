import mongoose from 'mongoose';
import { campoCentavosPositivo } from '../../utils/DineroUtils.js';

const variantSubSchema = new mongoose.Schema({
  talle: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '' },
  cantidad: { type: Number, required: true, min: 0, default: 0 },
  deposito: { type: Number, min: 0, default: 0 },
  catalogo: { type: Number, min: 0, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    precio: {
      ...campoCentavosPositivo,
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deposito: {
      type: Number,
      min: 0,
      default: 0,
    },
    catalogo: {
      type: Number,
      min: 0,
      default: 0,
    },
    variantes: {
      type: [variantSubSchema],
      default: [],
    },
    colores: {
      type: [String],
      default: [],
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    proveedor: {
      type: String,
      trim: true,
      default: '',
    },
    codigo: {
      type: String,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    stockMinimo: {
      type: Number,
      default: 2,
      min: 0,
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' }, toJSON: { getters: true } }
);

productSchema.pre('save', function (next) {
  if (this.variantes?.length > 0) {
    this.cantidad = this.variantes.reduce((sum, v) => sum + v.cantidad, 0);
    this.catalogo = this.variantes.reduce((sum, v) => sum + (v.catalogo || 0), 0);
  }
  next();
});

productSchema.index({ nombre: 'text' });
productSchema.index({ tienda: 1, categoria: 1 });
productSchema.index({ tienda: 1, codigo: 1 }, { unique: true, partialFilterExpression: { codigo: { $type: 'string' } } });

export default mongoose.model('Producto', productSchema, 'productos');