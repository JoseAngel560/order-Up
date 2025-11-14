"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/pedidoRoutes.ts
const express_1 = require("express");
const Pedido_1 = __importDefault(require("../models/Pedido"));
const Mesa_1 = __importDefault(require("../models/Mesa"));
const Empleado_1 = __importDefault(require("../models/Empleado"));
const Notification_1 = __importDefault(require("../models/Notification"));
const router = (0, express_1.Router)();
// Listar todos (Tu código - Sin cambios)
router.get('/', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const list = await Pedido_1.default.find({ restaurante_id: restaurante_id })
            .populate('mesa_id empleado_id')
            .sort({ fecha: -1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener uno (Tu código - Sin cambios)
router.get('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const doc = await Pedido_1.default.findOne({
            _id: req.params.id,
            restaurante_id: restaurante_id
        }).populate('mesa_id empleado_id');
        if (!doc)
            return res.status(404).json({ error: 'Pedido no encontrado o no pertenece a este restaurante' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// --- **Crear (Notificación Modificada)** ---
router.post('/', async (req, res) => {
    try {
        const { mesa_id, empleado_id, productos, total, fecha, estado, numero_mesa, restaurante_id } = req.body;
        // (Tu lógica de validación - Sin cambios)
        if (!empleado_id || !productos || !total || !fecha || !estado || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos faltantes (incluyendo restaurante_id)' });
        }
        if (productos.length === 0)
            return res.status(400).json({ error: 'Productos no puede estar vacío' });
        // (Tu lógica de pedido_id - Sin cambios)
        const maxPedido = await Pedido_1.default.findOne({ restaurante_id }, { pedido_id: 1 }).sort({ pedido_id: -1 });
        const newPedidoId = maxPedido ? maxPedido.pedido_id + 1 : 1;
        // (Tu lógica de Empleado/Admin - Sin cambios)
        const empleado = await Empleado_1.default.findOne({ usuario_id: empleado_id });
        let finalEmpleadoId = null;
        if (empleado) {
            finalEmpleadoId = empleado._id;
        }
        else {
            console.log(`Advertencia: Pedido creado por un Usuario (${empleado_id}) que no es un Empleado (probablemente un Admin).`);
        }
        // (Tu lógica de creación de Pedido - Sin cambios)
        const doc = new Pedido_1.default({
            pedido_id: newPedidoId,
            mesa_id,
            empleado_id: finalEmpleadoId,
            productos,
            total,
            fecha,
            estado,
            numero_mesa,
            restaurante_id
        });
        const saved = await doc.save();
        const populated = await Pedido_1.default.findById(saved._id).populate('mesa_id empleado_id');
        // ===============================================
        // --- INICIO DE CORRECCIÓN (Mensaje) ---
        // ===============================================
        try {
            const nombreMesa = numero_mesa ? `Mesa ${numero_mesa}` : 'Pedido para llevar';
            const notif = new Notification_1.default({
                // ANTES: `Nuevo pedido (#${newPedidoId}) para: ${nombreMesa}`
                mensaje: `Nuevo pedido para: ${nombreMesa}`, // <-- CORREGIDO
                tipo: 'orden',
                restaurante_id: restaurante_id
            });
            await notif.save();
            const io = req.io;
            if (io) {
                io.to(restaurante_id.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación emitida a la sala ${restaurante_id}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo la notificación:", notifError);
        }
        // ===============================================
        // --- FIN DE CORRECCIÓN ---
        // ===============================================
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- **Actualizar (Notificación Modificada)** ---
router.put('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const pedidoAnterior = await Pedido_1.default.findById(req.params.id);
        if (!pedidoAnterior) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        const estadoAnterior = pedidoAnterior.estado;
        delete req.body.restaurante_id;
        const updated = await Pedido_1.default.findOneAndUpdate({ _id: req.params.id, restaurante_id: restaurante_id }, req.body, { new: true, runValidators: true }).populate('mesa_id empleado_id');
        if (!updated)
            return res.status(404).json({ error: 'Pedido no encontrado o no pertenece a este restaurante' });
        // (Tu lógica para liberar mesa - Sin cambios)
        if (updated.mesa_id && updated.estado === 'Cancelado') {
            const allPedidosMesa = await Pedido_1.default.find({
                mesa_id: updated.mesa_id,
                restaurante_id: restaurante_id
            });
            const todosCancelados = allPedidosMesa.every(p => p.estado === 'Cancelado');
            if (todosCancelados) {
                await Mesa_1.default.findByIdAndUpdate(updated.mesa_id, { estado: 'Libre' });
            }
        }
        // ===============================================
        // --- INICIO DE CORRECCIÓN (Mensajes) ---
        // ===============================================
        try {
            const io = req.io;
            let notifMensaje = '';
            const nombreMesa = updated.numero_mesa ? `Mesa ${updated.numero_mesa}` : 'Pedido para llevar';
            if (updated.estado === 'Preparando' && estadoAnterior !== 'Preparando') {
                // ANTES: `El pedido (#${updated.pedido_id}) de ${nombreMesa} se está preparando.`
                notifMensaje = `El pedido de ${nombreMesa} se está preparando.`; // <-- CORREGIDO
            }
            else if (updated.estado === 'Servido' && estadoAnterior !== 'Servido') {
                // ANTES: `¡El pedido (#${updated.pedido_id}) de ${nombreMesa} está listo!`
                notifMensaje = `¡El pedido de ${nombreMesa} está listo!`; // <-- CORREGIDO
            }
            if (notifMensaje && io) {
                const notif = new Notification_1.default({
                    mensaje: notifMensaje,
                    tipo: 'orden',
                    restaurante_id: updated.restaurante_id
                });
                await notif.save();
                io.to(updated.restaurante_id.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de estado emitida: ${notifMensaje}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo notificación de estado:", notifError);
        }
        // ===============================================
        // --- FIN DE CORRECCIÓN ---
        // ===============================================
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Eliminar (Tu código - Sin cambios)
router.delete('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const deleted = await Pedido_1.default.findOneAndDelete({
            _id: req.params.id,
            restaurante_id: restaurante_id
        });
        if (!deleted)
            return res.status(404).json({ error: 'Pedido no encontrado o no pertenece a este restaurante' });
        res.json({ message: 'Pedido eliminado' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// --- RUTA DE VALIDACIÓN: VERIFICAR ÓRDENES PENDIENTES ---
router.get('/pendientes/:restaurante_id', async (req, res) => {
    try {
        const { restaurante_id } = req.params;
        // Buscamos pedidos que NO estén Pagados NI Cancelados
        const count = await Pedido_1.default.countDocuments({
            restaurante_id: restaurante_id,
            estado: { $nin: ['Pagado', 'Cancelado'] }
        });
        res.json({
            hasPendingOrders: count > 0,
            count: count
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
