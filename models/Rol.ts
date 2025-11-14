import mongoose, { Schema, Document } from 'mongoose';

export interface IAccesos {
  Ordenes: boolean;
  Cocina: boolean;
  Caja: boolean;
  Reportes: boolean;
}

export interface IRol extends Document {
  rol_id: number;
  nombre_rol: string;
  estado: boolean;
  accesos: IAccesos;
  restaurante_id: mongoose.Types.ObjectId;
}

const RolSchema: Schema = new Schema({
  // --- CAMBIO: Se quita 'unique: true' ---
  rol_id: { type: Number, required: true },
  // --- FIN CAMBIO ---
  nombre_rol: { type: String, required: true },
  estado: { type: Boolean, default: true },
  accesos: {
    Ordenes: { type: Boolean, default: false },
    Cocina: { type: Boolean, default: false },
    Caja: { type: Boolean, default: false },
    Reportes: { type: Boolean, default: false }
  },
  restaurante_id: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurante',
    required: true
  }
}, { timestamps: true });

// --- CAMBIO: Se añaden los índices compuestos ---
// El ID del rol debe ser único por restaurante
RolSchema.index({ restaurante_id: 1, rol_id: 1 }, { unique: true });
// El NOMBRE del rol también debe ser único por restaurante
RolSchema.index({ restaurante_id: 1, nombre_rol: 1 }, { unique: true });
// --- FIN CAMBIO ---

export default mongoose.model<IRol>('Rol', RolSchema);