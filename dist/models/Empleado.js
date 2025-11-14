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
const EmpleadoSchema = new mongoose_1.Schema({
    // --- CAMBIO: Se quita 'unique: true' ---
    empleado_id: { type: Number, required: true },
    nombrecompleto: { type: String, required: true, trim: true },
    telefono: { type: String, required: true },
    // --- CAMBIO: Se quita 'unique: true' ---
    email: { type: String, required: true, trim: true },
    rol_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Rol', required: true },
    restaurante_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Restaurante', required: true },
    usuario_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    activo: { type: Boolean, default: true }
}, { timestamps: true });
// --- CAMBIO: Se añaden los índices compuestos ---
EmpleadoSchema.index({ restaurante_id: 1, empleado_id: 1 }, { unique: true });
EmpleadoSchema.index({ restaurante_id: 1, email: 1 }, { unique: true });
// --- FIN CAMBIO ---
exports.default = mongoose_1.default.model('Empleado', EmpleadoSchema);
