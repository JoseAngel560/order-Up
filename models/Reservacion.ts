import mongoose, { Schema, Document } from 'mongoose';

export interface IReservacion extends Document {
  mesa_id: Schema.Types.ObjectId; // El ID de la mesa que se reserva
  restaurante_id: Schema.Types.ObjectId;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
  nombre_cliente?: string;
  telefono?: string;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada'; // Estado de la *reservación*
}

const ReservacionSchema: Schema = new Schema({
  mesa_id: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  nombre_cliente: { type: String },
  telefono: { type: String },
  estado: { type: String, required: true, enum: ['Pendiente', 'Confirmada', 'Cancelada'], default: 'Pendiente' }
}, { timestamps: true });

// Índice para buscar reservaciones por restaurante y fecha rápidamente
ReservacionSchema.index({ restaurante_id: 1, fecha: 1 });

export default mongoose.model<IReservacion>('Reservacion', ReservacionSchema);