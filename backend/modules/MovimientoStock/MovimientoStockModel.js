import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    tienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tienda',
    },
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
    },
    productoNombre: {
      type: String,
      trim: true,
      default: '',
    },
    talle: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
    tipo: {
      type: String,
      enum: [
        'ingreso_deposito',
        'ajuste_deposito',
        'reposicion',
        'retiro_deposito',
        'ajuste_salon',
        'reposicion_catalogo',
        'retiro_catalogo',
        'ajuste_catalogo',
        'ingreso_catalogo',
      ],
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
    },
    empleado: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } }
);

stockMovementSchema.index({ tienda: 1, fechaCreacion: -1 });
stockMovementSchema.index({ tienda: 1, tipo: 1, fechaCreacion: -1 });
stockMovementSchema.index({ tienda: 1, producto: 1 });

export default mongoose.model('MovimientoStock', stockMovementSchema, 'movimientosStock');
