import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    documento: {
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
    direccion: {
      type: String,
      trim: true,
      default: '',
    },
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
      index: true,
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } }
);

clientSchema.index({ tienda: 1, documento: 1 });
clientSchema.index({ tienda: 1, nombre: 1 }, { unique: true, partialFilterExpression: { nombre: { $type: 'string' } } });

export default mongoose.model('Cliente', clientSchema, 'clientes');
