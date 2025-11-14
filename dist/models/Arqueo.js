"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ArqueoSchema = new mongoose_1.Schema({
    restaurante_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Restaurante', required: true },
    cajero_apertura_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cajero_nombre: { type: String, required: true },
    fecha_apertura: { type: Date, required: true, default: Date.now },
    monto_inicial: { type: Number, required: true, default: 0 },
    fecha_cierre: { type: Date },
    cajero_cierre_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario' },
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
exports.default = mongoose_1.default.model('Arqueo', ArqueoSchema);
