"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/usuarios.js (COMPLETO Y CORREGIDO)
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Usuario_1 = __importDefault(require("../models/Usuario"));
const Restaurante_1 = __importDefault(require("../models/Restaurante"));
const router = (0, express_1.Router)();
// --- RUTAS EXISTENTES (SIN CAMBIOS) ---
// Listar todos
router.get('/', async (req, res) => {
    try {
        const list = await Usuario_1.default.find().populate('rol_id restaurante_id').sort({ nombreusuario: 1 });
        const safeList = list.map(u => ({ ...u.toObject(), contraseña: undefined }));
        res.json(safeList);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener uno
router.get('/:id', async (req, res) => {
    try {
        const doc = await Usuario_1.default.findById(req.params.id).populate('rol_id restaurante_id');
        if (!doc)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        const safeDoc = { ...doc.toObject(), contraseña: undefined };
        res.json(safeDoc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// Login endpoint (Sin cambios, ya estaba bien)
router.post('/login', async (req, res) => {
    try {
        const { identifier, password, restaurant_code } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier y contraseña requeridos' });
        }
        let query = { activo: true, $or: [{ email: identifier }, { nombreusuario: identifier }] };
        if (restaurant_code) {
            const rest_id_str = restaurant_code.replace('REST', '');
            const rest_num_id = parseInt(rest_id_str);
            if (isNaN(rest_num_id)) {
                return res.status(400).json({ error: 'Código de restaurante inválido' });
            }
            const restaurante = await Restaurante_1.default.findOne({ restaurante_id: rest_num_id });
            if (!restaurante) {
                return res.status(404).json({ error: 'Restaurante no encontrado' });
            }
            query.restaurante_id = restaurante._id;
        }
        const user = await Usuario_1.default.findOne(query).populate({
            path: 'rol_id',
            populate: { path: 'restaurante_id' }
        }).populate('restaurante_id');
        if (!user || !(await bcryptjs_1.default.compare(password, user.contraseña))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const safeUser = {
            ...user.toObject(),
            contraseña: undefined,
            rol: user.rol_id,
            accesos: user.rol_id.accesos
        };
        res.json({ user: safeUser, token: 'fake-jwt-token-for-demo' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Forgot Password (sin cambios)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email requerido' });
        const user = await Usuario_1.default.findOne({ email, activo: true });
        if (!user)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        user.resetCode = resetCode;
        user.resetExpiry = expiry;
        await user.save();
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'foodgestor01@gmail.com',
                pass: 'jlvy dnrf ycyo gyog',
            },
        });
        const mailOptions = {
            from: 'foodgestor01@gmail.com',
            to: email,
            subject: 'Código de Recuperación - Food Gestor',
            text: `Tu código de recuperación es: ${resetCode}. Expira en 10 minutos.`,
        };
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Código enviado al email' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Reset Password (sin cambios)
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;
        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({ error: 'Email, código y nueva contraseña requeridos' });
        }
        const user = await Usuario_1.default.findOne({ email, activo: true });
        if (!user)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.resetCode !== resetCode || !user.resetExpiry || user.resetExpiry < new Date()) {
            return res.status(400).json({ error: 'Código inválido o expirado' });
        }
        user.contraseña = await bcryptjs_1.default.hash(newPassword, 10);
        user.resetCode = undefined;
        user.resetExpiry = undefined;
        await user.save();
        res.json({ message: 'Contraseña actualizada exitosamente' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =================================================================
// --- **INICIO DE LA CORRECCIÓN** ---
// =================================================================
// Crear
router.post('/', async (req, res) => {
    try {
        const { Usuario_id, nombreusuario, email, contraseña, rol_id, restaurante_id, activo } = req.body;
        if (!Usuario_id || !nombreusuario || !email || !contraseña || !rol_id || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos faltantes' });
        }
        // --- **ESTA ES LA LÍNEA CORREGIDA** ---
        // Ahora busca un usuario con ese email/nombre Y que además coincida con el restaurante_id
        const exists = await Usuario_1.default.findOne({
            restaurante_id: restaurante_id,
            $or: [{ email }, { nombreusuario }]
        });
        if (exists) {
            // Si existe, AHORA SÍ es un error porque está duplicado EN ESE RESTAURANTE
            return res.status(409).json({ error: 'Email o usuario ya registrado en este restaurante' });
        }
        // --- **FIN DE LA CORRECCIÓN** ---
        const hashed = await bcryptjs_1.default.hash(contraseña, 10);
        const doc = new Usuario_1.default({ Usuario_id, nombreusuario, email, contraseña: hashed, rol_id, restaurante_id, activo });
        const saved = await doc.save();
        const populated = await Usuario_1.default.findById(saved._id).populate('rol_id restaurante_id');
        const safePopulated = { ...populated.toObject(), contraseña: undefined };
        res.status(201).json(safePopulated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =================================================================
// --- **FIN DE LA CORRECCIÓN** ---
// =================================================================
// Actualizar (con verificación de contraseña actual)
router.put('/:id', async (req, res) => {
    try {
        const { currentPassword, contraseña, ...updateData } = req.body;
        const user = await Usuario_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (!currentPassword) {
            return res.status(400).json({ error: 'Se requiere la contraseña actual para guardar los cambios.' });
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.contraseña);
        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }
        if (contraseña) {
            updateData.contraseña = await bcryptjs_1.default.hash(contraseña, 10);
        }
        const updated = await Usuario_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('rol_id restaurante_id');
        if (!updated) {
            return res.status(404).json({ error: 'No se pudo actualizar el usuario' });
        }
        const safeUpdated = { ...updated.toObject(), contraseña: undefined };
        res.json(safeUpdated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Usuario_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ message: 'Usuario eliminado' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
exports.default = router;
