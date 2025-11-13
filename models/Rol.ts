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
  restaurante_id: mongoose.Types.ObjectId;  // 👈 NUEVO: Asociación al restaurante
}

const RolSchema: Schema = new Schema({
  rol_id: { type: Number, required: true, unique: true },  // Mantiene unique global para ID
  nombre_rol: { type: String, required: true },  // Sin unique, permite duplicados por nombre (por rest)
  estado: { type: Boolean, default: true },
  accesos: {
    Ordenes: { type: Boolean, default: false },
    Cocina: { type: Boolean, default: false },
    Caja: { type: Boolean, default: false },
    Reportes: { type: Boolean, default: false }
  },
  restaurante_id: {  // 👈 NUEVO: Campo para asociar al restaurante
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurante',
    required: true
  }
}, { timestamps: true });

export default mongoose.model<IRol>('Rol', RolSchema);