import mongoose from 'mongoose';
import { esSlugValido } from './TiendaUtils.js';

export const ESTADOS_TIENDA = ['trial', 'activa', 'pausada'];
export const MODOS_VENTA = ['local', 'catalogo', 'ambos'];
export const DIAS_TRIAL = 7;

const temaSubSchema = new mongoose.Schema(
  {
    plantilla: { type: String, trim: true, default: 'base' },
    colorPrimario: { type: String, trim: true, default: '#111827' },
    colorSecundario: { type: String, trim: true, default: '#6b7280' },
    tipografia: { type: String, trim: true, default: 'Inter' },
    logo: { type: String, trim: true, default: '' },
    banner: { type: String, trim: true, default: '' },
    redes: {
      instagram: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      tiktok: { type: String, trim: true, default: '' },
    },
  },
  { _id: false }
);

const tiendaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: esSlugValido,
        message: 'El slug no es válido o está reservado',
      },
    },
    estado: {
      type: String,
      enum: ESTADOS_TIENDA,
      default: 'trial',
    },
    fechaInicio: {
      type: Date,
      default: Date.now,
    },
    fechaVencimiento: {
      type: Date,
    },
    plan: {
      type: String,
      trim: true,
      default: 'basico',
    },
    modoVenta: {
      type: String,
      enum: MODOS_VENTA,
      default: 'ambos',
    },
    whatsapp: {
      type: String,
      trim: true,
      default: '',
    },
    telefono: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    pais: {
      type: String,
      trim: true,
      default: 'AR',
    },
    dueno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    tema: {
      type: temaSubSchema,
      default: () => ({}),
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } }
);

tiendaSchema.methods.estaVigente = function estaVigente() {
  if (this.estado === 'activa') return true;
  if (this.estado !== 'trial') return false;
  return !this.fechaVencimiento || this.fechaVencimiento > new Date();
};

export default mongoose.model('Tienda', tiendaSchema, 'tiendas');
