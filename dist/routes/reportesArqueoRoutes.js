"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/reportesArqueoRoutes.ts
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Arqueo_1 = __importDefault(require("../models/Arqueo"));
const Restaurante_1 = __importDefault(require("../models/Restaurante")); // <-- 1. IMPORTAR RESTAURANTE
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { restaurante_id, fechaInicio, fechaFin, nombre_cajero } = req.query;
        if (!restaurante_id)
            return res.status(400).json({ error: 'Falta restaurante_id' });
        const restId = new mongoose_1.default.Types.ObjectId(restaurante_id);
        // --- 2. OBTENER CONFIGURACIÓN ACTUAL DEL RESTAURANTE ---
        const restaurante = await Restaurante_1.default.findById(restId);
        if (!restaurante) {
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        }
        const monedaObjetivo = restaurante.configuracion.moneda;
        const tasaObjetivo = restaurante.configuracion.tasa_cambio; // Tasa actual (ej: 1 USD = 38.5 NIO)
        // --- 3. FILTROS ---
        const filtros = {
            restaurante_id: restId
        };
        if (fechaInicio && fechaFin) {
            const start = new Date(fechaInicio);
            start.setHours(0, 0, 0, 0);
            const end = new Date(fechaFin);
            end.setHours(23, 59, 59, 999);
            filtros.fecha_apertura = { $gte: start, $lte: end };
        }
        if (nombre_cajero) {
            filtros.cajero_nombre = { $regex: new RegExp(nombre_cajero, 'i') };
        }
        // --- 4. OBTENER ARQUEOS ---
        const arqueos = await Arqueo_1.default.find(filtros)
            .populate('cajero_apertura_id', 'nombreusuario')
            .sort({ fecha_apertura: -1 });
        // --- 5. LÓGICA DE NORMALIZACIÓN Y SUMA (NUEVO) ---
        // Aquí calculamos los totales para el resumen del PDF
        let totalInicialNormalizado = 0;
        let totalVentasNormalizado = 0;
        let totalRealNormalizado = 0;
        let totalDiferenciaNormalizado = 0;
        for (const a of arqueos) {
            let tasaConversion = 1.0;
            const montoInicial = a.monto_inicial;
            const ventasEfectivo = a.ventas_efectivo_sistema;
            const montoReal = a.monto_final_real || 0;
            const diferencia = a.diferencia || 0;
            const monedaHist = a.moneda_base_historica;
            // Si la moneda del arqueo NO es la moneda objetivo del reporte, calculamos la tasa
            if (monedaHist !== monedaObjetivo) {
                // Caso 1: Arqueo en USD, Reporte en NIO
                // Convertimos el USD a NIO usando la tasa ACTUAL (tasaObjetivo)
                if (monedaHist === 'USD' && monedaObjetivo === 'NIO') {
                    tasaConversion = tasaObjetivo;
                }
                // Caso 2: Arqueo en NIO, Reporte en USD
                // Convertimos el NIO a USD usando la tasa ACTUAL (tasaObjetivo)
                else if (monedaHist === 'NIO' && monedaObjetivo === 'USD') {
                    // Evitar división por cero si la tasa es 0
                    tasaConversion = (tasaObjetivo !== 0) ? (1 / tasaObjetivo) : 0;
                }
            }
            // Aplicamos la tasa de conversión (será 1 si las monedas coinciden)
            totalInicialNormalizado += montoInicial * tasaConversion;
            totalVentasNormalizado += ventasEfectivo * tasaConversion;
            totalRealNormalizado += montoReal * tasaConversion;
            totalDiferenciaNormalizado += diferencia * tasaConversion;
        }
        // --- 6. ENVIAR RESPUESTA COMBINADA ---
        res.json({
            // 'resumen' contiene los totales normalizados a la MONEDA BASE ACTUAL
            resumen: {
                totalInicial: totalInicialNormalizado,
                totalVentas: totalVentasNormalizado,
                totalReal: totalRealNormalizado,
                totalDiferencia: totalDiferenciaNormalizado,
                monedaNormalizada: monedaObjetivo
            },
            // 'arqueos' es la lista individual con sus datos históricos intactos
            arqueos: arqueos
        });
    }
    catch (error) {
        console.error("Error reportes arqueo:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
