"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Factura_1 = __importDefault(require("../models/Factura"));
const Restaurante_1 = __importDefault(require("../models/Restaurante")); // <-- IMPORTADO
const mongoose_1 = __importDefault(require("mongoose"));
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
// --- RUTA DE RESUMEN (sin cambios) ---
router.get('/resumen/hoy', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const hoy = new Date();
        const inicioDia = (0, date_fns_1.startOfDay)(hoy);
        const finDia = (0, date_fns_1.endOfDay)(hoy);
        // ADVERTENCIA: Esta ruta sumará facturas en USD y NIO como si fueran lo mismo.
        // Necesita ser actualizada con lógica de "normalización".
        const facturasHoy = await Factura_1.default.find({
            fecha: {
                $gte: inicioDia.toISOString(),
                $lte: finDia.toISOString(),
            },
            restaurante_id: restaurante_id,
        });
        const ventasTotales = facturasHoy.reduce((sum, f) => sum + f.Total, 0);
        const ordenesCompletadas = facturasHoy.length;
        const ticketPromedio = ordenesCompletadas > 0 ? ventasTotales / ordenesCompletadas : 0;
        res.json({
            ventasTotales,
            ordenesCompletadas,
            ticketPromedio,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Listar todos (sin cambios) ---
router.get('/', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const list = await Factura_1.default.find({ restaurante_id: restaurante_id })
            .populate('pedido_id mesero_id cajero_id') // Populate actualizado
            .sort({ fecha: -1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Obtener uno (sin cambios) ---
router.get('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const doc = await Factura_1.default.findOne({
            _id: req.params.id,
            restaurante_id: restaurante_id
        }).populate('pedido_id mesero_id cajero_id'); // Populate actualizado
        if (!doc)
            return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// --- Ruta Crear (ACTUALIZADA) ---
router.post('/', async (req, res) => {
    try {
        const { pedido_id, metodo_pago, subtotal, propina, propina_percentage, Total, fecha, restaurante_id, 
        // CAMPOS NUEVOS Y RENOMBRADOS:
        cliente_nombre, cajero_id, mesero_id, monto_recibido, cambio } = req.body;
        // Validación más estricta incluyendo cajero_id y monto_recibido
        if (!pedido_id || !metodo_pago || !Total || !restaurante_id || !cajero_id || monto_recibido === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos para facturar (incluyendo cajero y montos).' });
        }
        // --- LEER LA CONFIG DEL RESTAURANTE ---
        const restaurante = await Restaurante_1.default.findById(restaurante_id);
        if (!restaurante)
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        // Lógica para generar el número de factura
        const maxResult = await Factura_1.default.aggregate([
            { $match: { restaurante_id: new mongoose_1.default.Types.ObjectId(restaurante_id) } },
            { $group: { _id: null, maxNum: { $max: { $toInt: "$numero_factura" } } } }
        ]);
        const lastNum = maxResult.length > 0 ? maxResult[0].maxNum : 0;
        const newNumFactura = (lastNum + 1).toString().padStart(4, '0');
        const doc = new Factura_1.default({
            numero_factura: newNumFactura,
            pedido_id, metodo_pago, subtotal, propina,
            propina_percentage, Total, fecha, restaurante_id,
            // GUARDAMOS LOS NUEVOS CAMPOS:
            cliente_nombre,
            cajero_id,
            mesero_id,
            monto_recibido,
            cambio,
            // --- CONGELAR MONEDA Y TASA ---
            moneda_base_historica: restaurante.configuracion.moneda,
            tasa_cambio_historica: restaurante.configuracion.tasa_cambio
        });
        const saved = await doc.save();
        // Populate útil para la respuesta inmediata
        const populated = await Factura_1.default.findById(saved._id)
            .populate('pedido_id')
            .populate('cajero_id', 'nombreusuario')
            .populate('mesero_id', 'nombrecompleto');
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Actualizar (sin cambios) ---
router.put('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        delete req.body.restaurante_id; // Por seguridad
        const updated = await Factura_1.default.findOneAndUpdate({ _id: req.params.id, restaurante_id: restaurante_id }, req.body, { new: true, runValidators: true }).populate('pedido_id mesero_id cajero_id');
        if (!updated)
            return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// --- Eliminar (sin cambios) ---
router.delete('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const deleted = await Factura_1.default.findOneAndDelete({
            _id: req.params.id,
            restaurante_id: restaurante_id
        });
        if (!deleted)
            return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
        res.json({ message: 'Factura eliminada' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
