import mongoose, { Schema, Document } from 'mongoose';

export interface IMesa extends Document {
  mesa_id: number;
  numero: number;
  capacidad: number;
  // 'Reservada' se elimina. El estado de la mesa es solo si hay alguien sentado.
  estado: 'Libre' | 'Ocupada'; 
  restaurante_id: Schema.Types.ObjectId;
}

const MesaSchema: Schema = new Schema({
  mesa_id: { type: Number, required: true, unique: true },
  numero: { type: Number, required: true },
  capacidad: { type: Number, required: true },
  // El estado por defecto es 'Libre'
  estado: { type: String, required: true, enum: ['Libre', 'Ocupada'], default: 'Libre' },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true }
}, { timestamps: true });

export default mongoose.model<IMesa>('Mesa', MesaSchema);