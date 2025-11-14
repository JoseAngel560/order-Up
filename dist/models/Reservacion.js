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
const ReservacionSchema = new mongoose_1.Schema({
    mesa_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mesa', required: true },
    restaurante_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Restaurante', required: true },
    fecha: { type: String, required: true },
    hora: { type: String, required: true },
    nombre_cliente: { type: String },
    telefono: { type: String },
    estado: { type: String, required: true, enum: ['Pendiente', 'Confirmada', 'Cancelada'], default: 'Pendiente' }
}, { timestamps: true });
// Índice para buscar reservaciones por restaurante y fecha rápidamente
ReservacionSchema.index({ restaurante_id: 1, fecha: 1 });
// --- CAMBIO: Se añade un índice para evitar doble-booking ---
// No puede haber dos reservaciones 'Pendientes' para la misma mesa, mismo restaurante, mismo día y misma hora.
ReservacionSchema.index({ restaurante_id: 1, mesa_id: 1, fecha: 1, hora: 1, estado: 1 }, { unique: true, partialFilterExpression: { estado: 'Pendiente' } });
// --- FIN CAMBIO ---
exports.default = mongoose_1.default.model('Reservacion', ReservacionSchema);
