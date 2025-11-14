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
const FacturaSchema = new mongoose_1.Schema({
    numero_factura: { type: String, required: true },
    pedido_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Pedido', required: true },
    metodo_pago: { type: String, required: true, enum: ['Efectivo', 'Transferencia', 'Ambos'] },
    subtotal: { type: Number, required: true },
    propina: { type: Number, required: true },
    propina_percentage: { type: Number, required: true },
    Total: { type: Number, required: true },
    fecha: { type: String, required: true },
    restaurante_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Restaurante', required: true },
    monto_recibido: { type: Number, required: true },
    cambio: { type: Number, required: true, default: 0 },
    cliente_nombre: { type: String },
    cajero_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    mesero_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Empleado' },
    // --- CAMPOS DE CONGELAMIENTO ---
    moneda_base_historica: { type: String, enum: ['USD', 'NIO'], required: true, default: 'NIO' },
    tasa_cambio_historica: { type: Number, required: true, default: 36.5 }
}, { timestamps: true });
FacturaSchema.index({ restaurante_id: 1, numero_factura: 1 }, { unique: true });
exports.default = mongoose_1.default.model('Factura', FacturaSchema);
