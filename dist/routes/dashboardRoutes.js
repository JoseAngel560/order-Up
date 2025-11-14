"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/dashboardRoutes.ts
const express_1 = require("express");
const Pedido_1 = __importDefault(require("../models/Pedido"));
const Mesa_1 = __importDefault(require("../models/Mesa"));
const Factura_1 = __importDefault(require("../models/Factura")); // <-- 1. IMPORTAR FACTURA
const Restaurante_1 = __importDefault(require("../models/Restaurante")); // <-- 2. IMPORTAR RESTAURANTE
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
/**
 * GET /api/dashboard/stats
 * Devuelve un objeto con todas las estadísticas clave para la HomeScreen.
 * (ACTUALIZADO CON NORMALIZACIÓN DE MONEDA)
 */
router.get('/stats', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const restId = new mongoose_1.default.Types.ObjectId(restaurante_id);
        // --- 1. OBTENER CONFIGURACIÓN ACTUAL DEL RESTAURANTE ---
        const restaurante = await Restaurante_1.default.findById(restId);
        if (!restaurante) {
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        }
        // Esta es la moneda a la que queremos convertir el total
        const monedaObjetivo = restaurante.configuracion.moneda;
        // ¡NO usaremos la tasa_cambio actual para el cálculo!
        // --- 2. Definir Rango de Hoy ---
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0); // 00:00:00
        const hoyFin = new Date();
        hoyFin.setHours(23, 59, 59, 999); // 23:59:59
        // --- 3. CÁLCULO DE VENTAS HOY (CORREGIDO) ---
        // Obtenemos las facturas de hoy
        const facturasHoy = await Factura_1.default.find({
            restaurante_id: restId,
            fecha: { $gte: hoyInicio.toISOString(), $lte: hoyFin.toISOString() }
        });
        // Inicializamos el total normalizado (en la moneda objetivo)
        let ventasTotalesNormalizadas = 0;
        for (const f of facturasHoy) {
            const total = f.Total;
            const monedaHist = f.moneda_base_historica;
            const tasaHist = f.tasa_cambio_historica;
            let tasaConversion = 1.0;
            // Solo convertimos si la moneda de la venta NO es la moneda base del restaurante
            if (monedaHist !== monedaObjetivo) {
                // Caso 1: Venta en USD (Hist), Reporte en NIO (Objetivo)
                if (monedaHist === 'USD' && monedaObjetivo === 'NIO') {
                    tasaConversion = tasaHist; // ej. 36.5
                }
                // Caso 2: Venta en NIO (Hist), Reporte en USD (Objetivo)
                else if (monedaHist === 'NIO' && monedaObjetivo === 'USD') {
                    tasaConversion = (tasaHist > 0) ? (1 / tasaHist) : 0;
                }
            }
            // Aplicamos la tasa (será 1.0 si las monedas coincidían)
            ventasTotalesNormalizadas += total * tasaConversion;
        }
        // ¡LISTO! ventasTotalesNormalizadas ahora es estable.
        // --- 4. Consultas en Paralelo (sin ventas) ---
        const [mesasOcupadas, ordenesActivas, tiempoPromedio] = await Promise.all([
            // a) Conteo de Mesas Ocupadas
            Mesa_1.default.countDocuments({
                estado: 'Ocupada',
                restaurante_id: restaurante_id
            }),
            // b) Conteo de Órdenes Activas
            Pedido_1.default.countDocuments({
                estado: { $in: ['Pendiente', 'Preparando'] },
                restaurante_id: restaurante_id
            }),
            // c) Tiempo Promedio de Órdenes Activas
            Pedido_1.default.aggregate([
                { $match: {
                        estado: { $in: ['Pendiente', 'Preparando'] },
                        restaurante_id: restId
                    } },
                { $project: {
                        duracion: { $subtract: [new Date(), "$createdAt"] }
                    } },
                { $group: {
                        _id: null,
                        tiempoPromedioMs: { $avg: "$duracion" }
                    } }
            ])
        ]);
        // --- 5. Formatear Resultados ---
        let tiempoPromedioMin = 0;
        if (tiempoPromedio.length > 0 && tiempoPromedio[0].tiempoPromedioMs) {
            tiempoPromedioMin = Math.round(tiempoPromedio[0].tiempoPromedioMs / 60000); // Convertir a minutos
        }
        // --- 6. Enviar Respuesta ---
        res.json({
            mesasOcupadas: mesasOcupadas,
            ordenesActivas: ordenesActivas,
            ventasTotales: ventasTotalesNormalizadas, // <-- ENVIAMOS EL TOTAL HISTÓRICAMENTE CORRECTO
            tiempoPromedio: `${tiempoPromedioMin}min`
        });
    }
    catch (err) {
        console.error("Error en GET /dashboard/stats:", err);
        res.status(500).json({ error: 'Error al cargar estadísticas: ' + err.message });
    }
});
/**
 * GET /api/dashboard/recent-orders
 * (Esta ruta no maneja dinero, está bien como está)
 */
router.get('/recent-orders', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const recentOrders = await Pedido_1.default.find({
            estado: { $in: ['Pendiente', 'Preparando'] },
            restaurante_id: restaurante_id
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('numero_mesa', 'numero');
        res.json(recentOrders);
    }
    catch (err) {
        console.error("Error en GET /dashboard/recent-orders:", err);
        res.status(500).json({ error: 'Error al cargar órdenes recientes: ' + err.message });
    }
});
exports.default = router;
