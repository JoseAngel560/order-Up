import mongoose, { Schema, Document } from 'mongoose';

export interface IEmpleado extends Document {
  empleado_id: number;
  nombrecompleto: string;
  telefono: string;
  email: string;
  rol_id: Schema.Types.ObjectId;
  restaurante_id: Schema.Types.ObjectId;
  usuario_id: Schema.Types.ObjectId;
  activo: boolean;
}

const EmpleadoSchema: Schema = new Schema({
  // --- CAMBIO: Se quita 'unique: true' ---
  empleado_id: { type: Number, required: true },
  nombrecompleto: { type: String, required: true, trim: true },
  telefono: { type: String, required: true },
  // --- CAMBIO: Se quita 'unique: true' ---
  email: { type: String, required: true, trim: true },
  rol_id: { type: Schema.Types.ObjectId, ref: 'Rol', required: true },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true },
  usuario_id: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

// --- CAMBIO: Se añaden los índices compuestos ---
EmpleadoSchema.index({ restaurante_id: 1, empleado_id: 1 }, { unique: true });
EmpleadoSchema.index({ restaurante_id: 1, email: 1 }, { unique: true });
// --- FIN CAMBIO ---

export default mongoose.model<IEmpleado>('Empleado', EmpleadoSchema);