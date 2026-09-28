import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    estado: {
      type: String,
      enum: ['pendiente', 'realizado'],
      default: 'pendiente',
    },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    destinatarioNombre: {
      type: String,
      trim: true,
      default: '',
    },
    realizadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    realizadoNombre: {
      type: String,
      trim: true,
      default: '',
    },
    realizadoEn: {
      type: Date,
      default: null,
    },
    comentario: {
      type: String,
      trim: true,
      default: '',
    },
    nuevaParaAdmin: {
      type: Boolean,
      default: false,
    },
    vistosPor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
      default: [],
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } }
);

notificationSchema.index({ tienda: 1, fechaCreacion: -1 });
notificationSchema.index({ tienda: 1, estado: 1, fechaCreacion: -1 });
notificationSchema.index({ tienda: 1, destinatario: 1, fechaCreacion: -1 });

export default mongoose.model('Notificacion', notificationSchema, 'notificaciones');