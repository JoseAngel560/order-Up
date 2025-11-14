// food-backend/routes/usuarios.ts (COMPLETO Y CORREGIDO CON CHECK-AVAILABILITY)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario';
import Restaurante from '../models/Restaurante';
import nodemailer from 'nodemailer';

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

    // Convertimos el identifier a minúsculas ANTES de buscar
    const lowerIdentifier = identifier.toLowerCase();

    let query: any = { 
      activo: true, 
      $or: [{ email: lowerIdentifier }, { nombreusuario: lowerIdentifier }] 
    };

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

// Forgot Password (sin cambios, pero con nodemailer importado arriba y createTransport corregido)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const user = await Usuario.findOne({ email: email.toLowerCase(), activo: true });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetCode = resetCode;
    user.resetExpiry = expiry;
    await user.save();
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'foodgestor01@gmail.com',
        pass: 'jlvy dnrf ycyo gyog', // Mover a env vars en producción
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
    const user = await Usuario.findOne({ email: email.toLowerCase(), activo: true });
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

// =================================================================
// --- NUEVA RUTA: CHECK-AVAILABILITY (AGREGADA PARA VALIDAR DUPLICADOS GLOBALES) ---
// =================================================================
router.post('/check-availability', async (req, res) => {
  try {
    const { email, nombreusuario } = req.body;

    if (email) {
      // Busca el email en minúsculas en TODA la base de datos
      const emailExists = await Usuario.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(409).json({ error: 'El email ya está en uso. Por favor, elige otro.' });
      }
    }

    if (nombreusuario) {
      // Busca el usuario en minúsculas en TODA la base de datos
      const userExists = await Usuario.findOne({ nombreusuario: nombreusuario.toLowerCase() });
      if (userExists) {
        return res.status(409).json({ error: 'El nombre de usuario ya está en uso. Por favor, elige otro.' });
      }
    }

    res.status(200).json({ message: 'Disponible' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// =================================================================
// --- FIN DE LA NUEVA RUTA ---
// =================================================================

// Crear (con corrección para duplicados por restaurante)
router.post('/', async (req, res) => {
  try {
    const { Usuario_id, nombreusuario, email, contraseña, rol_id, restaurante_id, activo } = req.body;
    if (!Usuario_id || !nombreusuario || !email || !contraseña || !rol_id || !restaurante_id) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    // Verifica duplicado SOLO en este restaurante (no global)
    const exists = await Usuario.findOne({ 
      restaurante_id: restaurante_id, 
      $or: [{ email: email.toLowerCase() }, { nombreusuario: nombreusuario.toLowerCase() }] 
    });
    
    if (exists) {
      return res.status(409).json({ error: 'Email o usuario ya registrado en este restaurante' });
    }

    const hashed = await bcrypt.hash(contraseña, 10);
    const doc = new Usuario({ 
      Usuario_id, 
      nombreusuario: nombreusuario.toLowerCase(), 
      email: email.toLowerCase(), 
      contraseña: hashed, 
      rol_id, 
      restaurante_id, 
      activo 
    });
    const saved = await doc.save();
    const populated = await Usuario.findById(saved._id).populate('rol_id restaurante_id');
    const safePopulated = { ...populated!.toObject(), contraseña: undefined };
    res.status(201).json(safePopulated);
  } catch (err: any) {
    // Manejo de errores de MongoDB (duplicados globales, si aplica)
    if (err.code === 11000) {
      if (err.message.includes('email_1')) {
        return res.status(409).json({ error: 'El email ya existe globalmente.' });
      }
      if (err.message.includes('nombreusuario_1')) {
        return res.status(409).json({ error: 'El nombre de usuario ya existe globalmente.' });
      }
    }
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
    // Normalizar email/usuario si se están actualizando
    if (updateData.email) updateData.email = updateData.email.toLowerCase();
    if (updateData.nombreusuario) updateData.nombreusuario = updateData.nombreusuario.toLowerCase();

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