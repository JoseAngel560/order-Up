"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/reservacionesRoutes.ts
const express_1 = require("express"); // <-- AÑADIDO: 'Request'
const mongoose_1 = __importDefault(require("mongoose"));
const Reservacion_1 = __importDefault(require("../models/Reservacion"));
const Notification_1 = __importDefault(require("../models/Notification")); // <-- 1. AÑADIDO: Importa Notificación
const router = (0, express_1.Router)();
// Obtener TODAS (Tu código - Sin cambios)
router.get('/', async (req, res) => {
    try {
        const { fecha, restaurante_id, mesa_id } = req.query;
        let filtro = {};
        if (fecha)
            filtro.fecha = fecha;
        if (restaurante_id)
            filtro.restaurante_id = new mongoose_1.default.Types.ObjectId(restaurante_id);
        if (mesa_id) {
            try {
                filtro.mesa_id = new mongoose_1.default.Types.ObjectId(mesa_id);
            }
            catch (err) {
                return res.status(400).json({ error: 'ID de mesa inválido' });
            }
        }
        const list = await Reservacion_1.default.find(filtro)
            .populate('mesa_id')
            .populate('restaurante_id')
            .sort({ fecha: 1, hora: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- **Crear (MODIFICADO PARA NOTIFICAR)** ---
router.post('/', async (req, res) => {
    try {
        const { mesa_id, restaurante_id, fecha, hora, nombre_cliente, telefono } = req.body;
        // (Tu lógica de validación - Sin cambios)
        // const existe = await Reservacion.findOne({ mesa_id, fecha, hora });
        // if (existe) return res.status(409).json({ error: 'Mesa ya reservada a esa hora' });
        const doc = new Reservacion_1.default({ ...req.body, estado: 'Pendiente' });
        const saved = await doc.save();
        const populated = await Reservacion_1.default.findById(saved._id)
            .populate('mesa_id')
            .populate('restaurante_id');
        // ===============================================
        // --- 2. AÑADIDO: Lógica de Notificación ---
        // ===============================================
        try {
            const io = req.io;
            // Obtenemos el número de la mesa del objeto 'populated'
            const numeroMesa = populated?.mesa_id?.numero; // Hacemos type assertion
            if (io && restaurante_id && numeroMesa) {
                const notif = new Notification_1.default({
                    mensaje: `Nueva reservación en Mesa #${numeroMesa} para las ${hora}`,
                    tipo: 'mesa', // Usamos el tipo 'mesa'
                    restaurante_id: restaurante_id
                });
                await notif.save();
                io.to(restaurante_id.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de reservación emitida para Mesa #${numeroMesa}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo notificación de reservación:", notifError);
        }
        // --- FIN: Lógica de Notificación ---
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Actualizar una reservación (Tu código - Sin cambios)
router.put('/:id', async (req, res) => {
    try {
        const updated = await Reservacion_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('mesa_id')
            .populate('restaurante_id');
        if (!updated)
            return res.status(404).json({ error: 'Reservación no encontrada' });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Eliminar una reservación (Tu código - Sin cambios)
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Reservacion_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Reservación no encontrada' });
        res.json({ message: 'Reservación eliminada' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
