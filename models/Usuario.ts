// Updated Usuario model with reset fields
import mongoose, { Schema, Document } from 'mongoose';

export interface IUsuario extends Document {
  Usuario_id: number;
  nombreusuario: string;
  email: string;
  contraseña: string;
  rol_id: Schema.Types.ObjectId;
  restaurante_id: Schema.Types.ObjectId;
  activo: boolean;
  fechacreacion: Date;
  resetCode?: string;
  resetExpiry?: Date;
}

const UsuarioSchema: Schema = new Schema({
  Usuario_id: { type: Number, required: true, unique: true }, // Este está bien, el ID sí debe ser único
  
  // --- INICIO CORRECCIÓN ---
  nombreusuario: { type: String, required: true }, // Se quitó 'unique: true'
  email: { type: String, required: true },         // Se quitó 'unique: true'
  // --- FIN CORRECCIÓN ---

  contraseña: { type: String, required: true },
  rol_id: { type: Schema.Types.ObjectId, ref: 'Rol', required: true },
  restaurante_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Restaurante', 
    required: true,
    index: true // Se añade index aquí para búsquedas rápidas
  },
  activo: { type: Boolean, default: true },
  fechacreacion: { type: Date, default: Date.now },
  resetCode: { type: String },
  resetExpiry: { type: Date }
}, { timestamps: true });

// --- **SE AÑADEN LOS ÍNDICES COMPUESTOS AQUÍ** ---
// Esto le dice a la DB que la combinación de restaurante + usuario debe ser única
UsuarioSchema.index({ restaurante_id: 1, nombreusuario: 1 }, { unique: true });
UsuarioSchema.index({ restaurante_id: 1, email: 1 }, { unique: true });
// ---

export default mongoose.model<IUsuario>('Usuario', UsuarioSchema);