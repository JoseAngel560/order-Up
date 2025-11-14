"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Archivo: (backend)/routes/mesas.ts
const express_1 = require("express"); // <-- AÑADIDO: 'Request'
const Mesa_1 = __importDefault(require("../models/Mesa"));
const Notification_1 = __importDefault(require("../models/Notification")); // <-- 1. AÑADIDO: Importa Notificación
const router = (0, express_1.Router)();
// Listar todos (Tu código - Sin cambios)
router.get('/', async (req, res) => {
    try {
        const list = await Mesa_1.default.find().populate('restaurante_id').sort({ numero: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener uno (Tu código - Sin cambios)
router.get('/:id', async (req, res) => {
    try {
        const doc = await Mesa_1.default.findById(req.params.id).populate('restaurante_id');
        if (!doc)
            return res.status(404).json({ error: 'Mesa no encontrada' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// Crear (Tu código - Sin cambios)
router.post('/', async (req, res) => {
    try {
        const { mesa_id, numero, capacidad, estado, restaurante_id } = req.body;
        if (!mesa_id || !numero || !capacidad || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos (mesa_id, numero, capacidad, restaurante_id) faltantes' });
        }
        const doc = new Mesa_1.default({ mesa_id, numero, capacidad, estado, restaurante_id });
        const saved = await doc.save();
        const populated = await Mesa_1.default.findById(saved._id).populate('restaurante_id');
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- **Actualizar (MODIFICADO PARA NOTIFICAR LIBERACIÓN)** ---
router.put('/:id', async (req, res) => {
    try {
        // --- 2. AÑADIDO: Obtener estado anterior ---
        const mesaAnterior = await Mesa_1.default.findById(req.params.id);
        if (!mesaAnterior) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }
        const estadoAnterior = mesaAnterior.estado;
        const restauranteId = mesaAnterior.restaurante_id; // Guardamos el ID para el socket
        // --- FIN AÑADIDO ---
        const updated = await Mesa_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('restaurante_id');
        if (!updated)
            return res.status(404).json({ error: 'Mesa no encontrada' });
        // ===============================================
        // --- 3. AÑADIDO: Lógica de Notificación ---
        // ===============================================
        try {
            const io = req.io;
            // Si el estado ANTERIOR era 'Ocupada' Y el NUEVO es 'Libre'
            if (estadoAnterior === 'Ocupada' && updated.estado === 'Libre' && io) {
                const notif = new Notification_1.default({
                    mensaje: `Mesa #${updated.numero} ha sido liberada.`,
                    tipo: 'mesa', // Usamos el tipo 'mesa'
                    restaurante_id: restauranteId
                });
                await notif.save();
                io.to(restauranteId.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de mesa liberada emitida para Mesa #${updated.numero}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo notificación de mesa liberada:", notifError);
        }
        // --- FIN: Lógica de Notificación ---
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Eliminar (Tu código - Sin cambios)
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Mesa_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Mesa no encontrada' });
        res.json({ message: 'Mesa eliminada' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
