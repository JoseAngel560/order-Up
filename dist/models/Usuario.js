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
// Updated Usuario model with reset fields
const mongoose_1 = __importStar(require("mongoose"));
const UsuarioSchema = new mongoose_1.Schema({
    Usuario_id: { type: Number, required: true, unique: true }, // Este está bien, el ID sí debe ser único
    // --- INICIO CORRECCIÓN ---
    nombreusuario: { type: String, required: true }, // Se quitó 'unique: true'
    email: { type: String, required: true }, // Se quitó 'unique: true'
    // --- FIN CORRECCIÓN ---
    contraseña: { type: String, required: true },
    rol_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Rol', required: true },
    restaurante_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Restaurante',
        required: true,
        index: true // Se añade index aquí para búsquedas rápidas
    },
    activo: { type: Boolean, default: true },
    fechacreacion: { type: Date, default: Date.now },
    resetCode: { type: String },
    resetExpiry: { type: Date }
}, { timestamps: true });
// --- **SE AÑADEN LOS ÍNDICES COMPUESTOS AQUÍ** ---
// Esto le dice a la DB que la combinación de restaurante + usuario debe ser única
UsuarioSchema.index({ restaurante_id: 1, nombreusuario: 1 }, { unique: true });
UsuarioSchema.index({ restaurante_id: 1, email: 1 }, { unique: true });
// ---
exports.default = mongoose_1.default.model('Usuario', UsuarioSchema);
