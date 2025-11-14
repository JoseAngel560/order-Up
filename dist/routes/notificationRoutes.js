"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/notificationRoutes.ts
const express_1 = require("express");
const Notification_1 = __importDefault(require("../models/Notification")); // (Usando el nombre de tu modelo)
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// GET /api/notificaciones?restaurante_id=... (Sin cambios)
router.get('/', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const notificaciones = await Notification_1.default.find({
            restaurante_id: new mongoose_1.default.Types.ObjectId(restaurante_id)
        })
            .sort({ fecha: -1 })
            .limit(50);
        res.json(notificaciones);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ===============================================
// --- ¡CORRECCIÓN! LA RUTA '/all' VA PRIMERO ---
// ===============================================
router.delete('/all', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido para borrar todo' });
        }
        const result = await Notification_1.default.deleteMany({
            restaurante_id: new mongoose_1.default.Types.ObjectId(restaurante_id)
        });
        console.log(`Se eliminaron ${result.deletedCount} notificaciones para el restaurante ${restaurante_id}`);
        res.json({ message: 'Todas las notificaciones han sido eliminadas' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar notificaciones: ' + err.message });
    }
});
// ===============================================
// --- LA RUTA '/:id' VA DESPUÉS ---
router.delete('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const deleted = await Notification_1.default.findOneAndDelete({
            _id: req.params.id,
            restaurante_id: new mongoose_1.default.Types.ObjectId(restaurante_id)
        });
        if (!deleted)
            return res.status(404).json({ error: 'Notificación no encontrada' });
        res.json({ message: 'Notificación eliminada' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
