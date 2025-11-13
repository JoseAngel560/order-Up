// food-backend/models/Notificacion.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface INotificacion extends Document {
  mensaje: string;
  tipo: 'orden' | 'mesa' | 'inventario' | 'general';
  leida: boolean;
  fecha: Date;
  restaurante_id: Schema.Types.ObjectId;
}

const NotificacionSchema: Schema = new Schema({
  mensaje: { type: String, required: true },
  tipo: { type: String, required: true, enum: ['orden', 'mesa', 'inventario', 'general'] },
  leida: { type: Boolean, default: false },
  fecha: { type: Date, default: Date.now },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true } 
});

export default mongoose.model<INotificacion>('Notificacion', NotificacionSchema);