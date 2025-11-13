import mongoose, { Schema, Document } from 'mongoose';

export interface IProductoPedido {
  productoId: string;
  cantidad: number;
  precio: number;
  nombre: string;
  descripcion?: string;
  notes?: string;
  estado: 'Pendiente' | 'Preparando' | 'Servido' | 'Cancelado';
  updatedAt?: Date;
}

export interface IPedido extends Document {
  pedido_id: number;
  mesa_id?: Schema.Types.ObjectId | null;
  // --- CAMBIO: Se hace opcional para permitir nulos (Admins) ---
  empleado_id?: Schema.Types.ObjectId | null; 
  // --- FIN DEL CAMBIO ---
  productos: IProductoPedido[];
  total: number;
  fecha: Date;
  estado: 'Pendiente' | 'Preparando' | 'Servido' | 'Cancelado' | 'Pagado';
  numero_mesa?: number;
  restaurante_id: Schema.Types.ObjectId;
}

const ProductoPedidoSchema: Schema = new Schema({
  productoId: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precio: { type: Number, required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  notes: { type: String },
  estado: { type: String, enum: ['Pendiente', 'Preparando', 'Servido', 'Cancelado'], default: 'Pendiente', required: true },
  updatedAt: { type: Date, default: Date.now }
});

const PedidoSchema: Schema = new Schema({
  pedido_id: { type: Number, required: true },
  mesa_id: { type: Schema.Types.ObjectId, ref: 'Mesa' },
  
  // --- CAMBIO: Se quita 'required: true' ---
  empleado_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Empleado' 
    // required: true // <-- Esta línea se ha eliminado
  },
  // --- FIN DEL CAMBIO ---

  productos: [ProductoPedidoSchema],
  total: { type: Number, required: true },
  fecha: { type: Date, required: true },
  estado: { 
    type: String, 
    required: true, 
    enum: ['Pendiente', 'Preparando', 'Servido', 'Cancelado', 'Pagado'] 
  },
  numero_mesa: { type: Number },
  restaurante_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Restaurante', 
    required: true 
  }
}, { timestamps: true });

PedidoSchema.index({ restaurante_id: 1, pedido_id: 1 }, { unique: true });

export default mongoose.model<IPedido>('Pedido', PedidoSchema);