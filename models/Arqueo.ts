import mongoose, { Schema, Document } from 'mongoose';

export interface IArqueo extends Document {
    restaurante_id: Schema.Types.ObjectId;
    
    // --- APERTURA ---
    cajero_apertura_id: Schema.Types.ObjectId;
    cajero_nombre: string;
    fecha_apertura: Date;
    monto_inicial: number; // En Moneda Base
    
    // --- CIERRE ---
    fecha_cierre?: Date;
    cajero_cierre_id?: Schema.Types.ObjectId;
    
    // --- TOTALES DEL SISTEMA (En Moneda Base) ---
    ventas_efectivo_sistema: number;
    ventas_tarjeta_sistema: number;
    otros_ingresos: number;
    salidas_dinero: number;
    
    // --- CUADRE DE CAJA (En Moneda Base) ---
    monto_final_esperado: number;
    monto_final_real?: number;
    diferencia?: number;
    
    estado: 'Abierta' | 'Cerrada';
    notas?: string;

    // --- CAMPOS DE CONGELAMIENTO (ACTUALIZADOS) ---
    moneda_base_historica: 'USD' | 'NIO'; // (NUEVO Y VITAL) En qué moneda están los montos
    tasa_cambio_historica: number;       // (EXISTENTE) 1 USD = X C$ en ese momento
}

const ArqueoSchema: Schema = new Schema({
    restaurante_id: { type: Schema.Types.ObjectId, ref: 'Restaurante', required: true },
    
    cajero_apertura_id: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cajero_nombre: { type: String, required: true },
    fecha_apertura: { type: Date, required: true, default: Date.now },
    monto_inicial: { type: Number, required: true, default: 0 },
    
    fecha_cierre: { type: Date },
    cajero_cierre_id: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    
    ventas_efectivo_sistema: { type: Number, default: 0 },
    ventas_tarjeta_sistema: { type: Number, default: 0 },
    otros_ingresos: { type: Number, default: 0 },
    salidas_dinero: { type: Number, default: 0 },
    
    monto_final_esperado: { type: Number, default: 0 },
    monto_final_real: { type: Number },
    diferencia: { type: Number },
    
    estado: { type: String, enum: ['Abierta', 'Cerrada'], default: 'Abierta' },
    notas: { type: String },

    // --- CAMPOS DE CONGELAMIENTO ---
    moneda_base_historica: { type: String, enum: ['USD', 'NIO'], required: true, default: 'NIO' },
    tasa_cambio_historica: { type: Number, required: true, default: 36.5 }

}, { timestamps: true });

ArqueoSchema.index({ restaurante_id: 1, cajero_apertura_id: 1, estado: 1 }, { unique: true, partialFilterExpression: { estado: 'Abierta' } });

export default mongoose.model<IArqueo>('Arqueo', ArqueoSchema);