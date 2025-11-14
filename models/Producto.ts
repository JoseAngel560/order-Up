import mongoose, { Schema, Document } from 'mongoose';

export interface IProducto extends Document {
  producto_id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  disponible: boolean;
  imagenURL?: string;
  restaurante_id: Schema.Types.ObjectId;
}

const ProductoSchema: Schema = new Schema({
  // --- CAMBIO: Se quita 'unique: true' de aquí ---
  producto_id: { type: Number, required: true },
  // --- FIN CAMBIO ---
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  categoria: { type: String, required: true },
  precio: { type: Number, required: true },
  disponible: { type: Boolean, default: true },
  imagenURL: { type: String },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true }
}, { timestamps: true });

// --- CAMBIO: Se añade el índice compuesto ---
ProductoSchema.index({ restaurante_id: 1, producto_id: 1 }, { unique: true });
// --- FIN CAMBIO ---

export default mongoose.model<IProducto>('Producto', ProductoSchema);