import mongoose, { Schema, Document } from 'mongoose';

export interface IFactura extends Document {
  numero_factura: string;
  pedido_id: Schema.Types.ObjectId;
  metodo_pago: 'Efectivo' | 'Transferencia' | 'Ambos';
  subtotal: number;       // Todos estos valores están en la MONEDA BASE
  propina: number;
  propina_percentage: number;
  Total: number;          // <-- En Moneda Base Histórica
  fecha: string;
  restaurante_id: Schema.Types.ObjectId;
  monto_recibido: number;
  cambio: number;
  cliente_nombre?: string;
  cajero_id: Schema.Types.ObjectId;
  mesero_id?: Schema.Types.ObjectId;

  // --- CAMPOS DE CONGELAMIENTO (ACTUALIZADOS) ---
  moneda_base_historica: 'USD' | 'NIO'; // (NUEVO Y VITAL) En qué moneda es el 'Total'
  tasa_cambio_historica: number;       // (EXISTENTE) 1 USD = X C$ en ese momento
}

const FacturaSchema: Schema = new Schema({
  numero_factura: { type: String, required: true },
  pedido_id: { type: Schema.Types.ObjectId, ref: 'Pedido', required: true },
  metodo_pago: { type: String, required: true, enum: ['Efectivo', 'Transferencia', 'Ambos'] },
  subtotal: { type: Number, required: true },
  propina: { type: Number, required: true },
  propina_percentage: { type: Number, required: true },
  Total: { type: Number, required: true },
  fecha: { type: String, required: true },
  restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true },
  monto_recibido: { type: Number, required: true },
  cambio: { type: Number, required: true, default: 0 },
  cliente_nombre: { type: String },
  cajero_id: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  mesero_id: { type: Schema.Types.ObjectId, ref: 'Empleado' },
  
  // --- CAMPOS DE CONGELAMIENTO ---
  moneda_base_historica: { type: String, enum: ['USD', 'NIO'], required: true, default: 'NIO' },
  tasa_cambio_historica: { type: Number, required: true, default: 36.5 }

}, { timestamps: true });

FacturaSchema.index({ restaurante_id: 1, numero_factura: 1 }, { unique: true });

export default mongoose.model<IFactura>('Factura', FacturaSchema);