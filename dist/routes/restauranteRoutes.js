"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Restaurante_1 = __importDefault(require("../models/Restaurante"));
const router = (0, express_1.Router)();
// Listar todos
router.get('/', async (req, res) => {
    try {
        const list = await Restaurante_1.default.find().sort({ nombre_restaurante: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener uno
router.get('/:id', async (req, res) => {
    try {
        const doc = await Restaurante_1.default.findById(req.params.id);
        if (!doc)
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// Crear (ACTUALIZADO)
router.post('/', async (req, res) => {
    try {
        const { restaurante_id, nombre_restaurante, direccion, telefono, // <--- RECIBIR TELEFONO
        mesas, cargos_seleccionados, servicios_disponibles, configuracion } = req.body;
        // Validar que venga el telefono
        if (!restaurante_id || !nombre_restaurante || !direccion || !telefono || !mesas) {
            return res.status(400).json({ error: 'Campos requeridos faltantes (incluyendo teléfono)' });
        }
        const doc = new Restaurante_1.default({
            restaurante_id, nombre_restaurante, direccion, telefono, // <--- GUARDAR TELEFONO
            mesas, cargos_seleccionados, servicios_disponibles, configuracion
        });
        const saved = await doc.save();
        res.status(201).json(saved);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar (ACTUALIZADO PARA MONEDA Y TASA)
router.put('/:id', async (req, res) => {
    try {
        // Validar campos clave si se envían
        const { nombre_restaurante, direccion, telefono, configuracion } = req.body;
        if (nombre_restaurante || direccion || telefono) {
            if (!nombre_restaurante || !direccion || !telefono) {
                return res.status(400).json({ error: 'Si actualizas info básica, todos los campos son requeridos (nombre, dirección, teléfono)' });
            }
        }
        if (configuracion?.moneda && !configuracion.tasa_cambio) {
            return res.status(400).json({ error: 'Si cambias la moneda, debes proporcionar la tasa de cambio (1 USD = X C$)' });
        }
        const updated = await Restaurante_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated)
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Eliminar
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Restaurante_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        res.json({ message: 'Restaurante eliminado' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
