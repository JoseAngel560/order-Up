import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario';
import Restaurante from '../models/Restaurante';
import nodemailer from 'nodemailer'; // <--- ¡Importación corregida al inicio!

const router = Router();

// --- RUTAS EXISTENTES (SIN CAMBIOS) ---

// Listar todos
router.get('/', async (req, res) => {
  try {
    const list = await Usuario.find().populate('rol_id restaurante_id').sort({ nombreusuario: 1 });
    const safeList = list.map(u => ({ ...u.toObject(), contraseña: undefined }));
    res.json(safeList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener uno
router.get('/:id', async (req, res) => {
  try {
    const doc = await Usuario.findById(req.params.id).populate('rol_id restaurante_id');
    if (!doc) return res.status(404).json({ error: 'Usuario no encontrado' });
    const safeDoc = { ...doc.toObject(), contraseña: undefined };
    res.json(safeDoc);
  } catch (err: any) {
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
    let query: any = { activo: true, $or: [{ email: identifier }, { nombreusuario: identifier }] };
    if (restaurant_code) {
      const rest_id_str = restaurant_code.replace('REST', '');
      const rest_num_id = parseInt(rest_id_str);
      if (isNaN(rest_num_id)) {
        return res.status(400).json({ error: 'Código de restaurante inválido' });
      }
      const restaurante = await Restaurante.findOne({ restaurante_id: rest_num_id });
      if (!restaurante) {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
      }
      query.restaurante_id = restaurante._id;
    }
    const user = await Usuario.findOne(query).populate({
      path: 'rol_id',
      populate: { path: 'restaurante_id' }
    }).populate('restaurante_id');
    
    if (!user || !(await bcrypt.compare(password, user.contraseña))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const safeUser = { 
      ...user.toObject(), 
      contraseña: undefined,
      rol: user.rol_id, 
      accesos: (user.rol_id as any).accesos
    };
    res.json({ user: safeUser, token: 'fake-jwt-token-for-demo' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password (CORREGIDO)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const user = await Usuario.findOne({ email, activo: true });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetCode = resetCode;
    user.resetExpiry = expiry;
    await user.save();
    
    // Utilizamos el import que ya está en el scope
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'foodgestor01@gmail.com',
        pass: 'jlvy dnrf ycyo gyog', // OJO: Si usas una App Password de Google, debe tener espacios.
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
  } catch (err: any) {
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
    const user = await Usuario.findOne({ email, activo: true });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.resetCode !== resetCode || !user.resetExpiry || user.resetExpiry < new Date()) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }
    user.contraseña = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetExpiry = undefined;
    await user.save();
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Crear
router.post('/', async (req, res) => {
  try {
    const { Usuario_id, nombreusuario, email, contraseña, rol_id, restaurante_id, activo } = req.body;
    if (!Usuario_id || !nombreusuario || !email || !contraseña || !rol_id || !restaurante_id) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    // Búsqueda para evitar duplicados en el mismo restaurante
    const exists = await Usuario.findOne({ 
        restaurante_id: restaurante_id, 
        $or: [{ email }, { nombreusuario }] 
    });
    
    if (exists) {
        return res.status(409).json({ error: 'Email o usuario ya registrado en este restaurante' });
    }

    const hashed = await bcrypt.hash(contraseña, 10);
    const doc = new Usuario({ Usuario_id, nombreusuario, email, contraseña: hashed, rol_id, restaurante_id, activo });
    const saved = await doc.save();
    const populated = await Usuario.findById(saved._id).populate('rol_id restaurante_id');
    const safePopulated = { ...populated!.toObject(), contraseña: undefined };
    res.status(201).json(safePopulated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar (con verificación de contraseña actual)
router.put('/:id', async (req, res) => {
  try {
    const { currentPassword, contraseña, ...updateData } = req.body;
    const user = await Usuario.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Se requiere la contraseña actual para guardar los cambios.' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.contraseña);
    if (!isMatch) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
    }
    if (contraseña) {
      updateData.contraseña = await bcrypt.hash(contraseña, 10);
    }
    const updated = await Usuario.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('rol_id restaurante_id');
    if (!updated) {
      return res.status(404).json({ error: 'No se pudo actualizar el usuario' });
    }
    const safeUpdated = { ...updated.toObject(), contraseña: undefined };
    res.json(safeUpdated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Usuario.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;