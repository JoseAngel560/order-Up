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
const RestauranteSchema = new mongoose_1.Schema({
    restaurante_id: { type: Number, required: true, unique: true },
    nombre_restaurante: { type: String, required: true },
    direccion: { type: String, required: true },
    telefono: { type: String, required: true }, // <--- NUEVO CAMPO OBLIGATORIO
    mesas: { type: Number, required: true },
    cargos_seleccionados: [String],
    servicios_disponibles: {
        serv_mesa: { type: Boolean, default: false },
        delivery: { type: Boolean, default: false }
    },
    configuracion: {
        propina_default: { type: Number, default: 0 },
        impuesto_default: { type: Number, default: 15 },
        moneda: { type: String, enum: ['USD', 'NIO'], default: 'NIO' }, // <--- LIMITADO A USD/NIO
        tasa_cambio: { type: Number, default: 36.5 }, // <--- NUEVO
        // notif_sonido ELIMINADO
    }
}, { timestamps: true });
exports.default = mongoose_1.default.model('Restaurante', RestauranteSchema);
