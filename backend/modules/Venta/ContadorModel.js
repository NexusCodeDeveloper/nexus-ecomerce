import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  tienda: { type: mongoose.Schema.Types.ObjectId, ref: 'Tienda' },
  secuencia: { type: Number, default: 0 },
});

export default mongoose.model('Contador', counterSchema, 'contadores');
