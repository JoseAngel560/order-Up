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
  producto_id: { type: Number, required: true, unique: true },
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  categoria: { type: String, required: true },
  precio: { type: Number, required: true },
  disponible: { type: Boolean, default: true },
  imagenURL: { type: String },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true }
}, { timestamps: true });

export default mongoose.model<IProducto>('Producto', ProductoSchema);