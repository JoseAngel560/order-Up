import { Router } from 'express';
import Empleado from '../models/Empleado';

const router = Router();

// Listar todos
router.get('/', async (req, res) => {
  try {
    const list = await Empleado.find().populate('rol_id restaurante_id usuario_id').sort({ nombrecompleto: 1 });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener uno
router.get('/:id', async (req, res) => {
  try {
    const doc = await Empleado.findById(req.params.id).populate('rol_id restaurante_id usuario_id');
    if (!doc) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(doc);
  } catch (err: any) {
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
    const exists = await Empleado.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });
    const doc = new Empleado({ empleado_id, nombrecompleto, telefono, email, rol_id, restaurante_id, usuario_id, activo });
    const saved = await doc.save();
    const populated = await Empleado.findById(saved._id).populate('rol_id restaurante_id usuario_id');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar
router.put('/:id', async (req, res) => {
  try {
    const updated = await Empleado.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('rol_id restaurante_id usuario_id');
    if (!updated) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Empleado.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado eliminado' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;