"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Empleado_1 = __importDefault(require("../models/Empleado"));
const router = (0, express_1.Router)();
// Listar todos
router.get('/', async (req, res) => {
    try {
        const list = await Empleado_1.default.find().populate('rol_id restaurante_id usuario_id').sort({ nombrecompleto: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener uno
router.get('/:id', async (req, res) => {
    try {
        const doc = await Empleado_1.default.findById(req.params.id).populate('rol_id restaurante_id usuario_id');
        if (!doc)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// Crear
router.post('/', async (req, res) => {
    try {
        const { empleado_id, nombrecompleto, telefono, email, rol_id, restaurante_id, usuario_id, activo } = req.body;
        if (!empleado_id || !nombrecompleto || !email) {
            return res.status(400).json({ error: 'empleado_id, nombrecompleto y email requeridos' });
        }
        const exists = await Empleado_1.default.findOne({ email });
        if (exists)
            return res.status(409).json({ error: 'Email ya registrado' });
        const doc = new Empleado_1.default({ empleado_id, nombrecompleto, telefono, email, rol_id, restaurante_id, usuario_id, activo });
        const saved = await doc.save();
        const populated = await Empleado_1.default.findById(saved._id).populate('rol_id restaurante_id usuario_id');
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar
router.put('/:id', async (req, res) => {
    try {
        const updated = await Empleado_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('rol_id restaurante_id usuario_id');
        if (!updated)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Eliminar
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Empleado_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json({ message: 'Empleado eliminado' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
