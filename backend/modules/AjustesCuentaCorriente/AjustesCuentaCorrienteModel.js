import mongoose from 'mongoose';

export const AJUSTES_POR_DEFECTO = {
  interesFinanciacionPorcentaje: 10,
  tasaMoraMensualPorcentaje: 5,
  diasAvisoVencimiento: 3,
};

const ajustesSchema = new mongoose.Schema(
  {
    interesFinanciacionPorcentaje: {
      type: Number,
      default: AJUSTES_POR_DEFECTO.interesFinanciacionPorcentaje,
      min: 0,
      max: 1000,
    },
    tasaMoraMensualPorcentaje: {
      type: Number,
      default: AJUSTES_POR_DEFECTO.tasaMoraMensualPorcentaje,
      min: 0,
      max: 1000,
    },
    diasAvisoVencimiento: {
      type: Number,
      default: AJUSTES_POR_DEFECTO.diasAvisoVencimiento,
      min: 0,
      max: 60,
    },
    actualizadoPor: {
      type: String,
      trim: true,
      default: '',
    },
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
      required: true,
      index: true,
      unique: true,
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } }
);

ajustesSchema.index({ tienda: 1 }, { unique: true });

export default mongoose.model('AjustesCuentaCorriente', ajustesSchema, 'ajustesCuentaCorriente');
