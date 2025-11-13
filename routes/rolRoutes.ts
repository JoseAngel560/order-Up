import { Router } from 'express';
import Rol from '../models/Rol';
import Restaurante from '../models/Restaurante';

const router = Router();

// Listar todos (ahora con filtro por restaurante si se pasa en query)
router.get('/', async (req, res) => {
  try {
    let query: any = {};
    if (req.query.restaurante_id) {  // 👈 NUEVO: Filtro por restaurante
      query.restaurante_id = req.query.restaurante_id;
    }
    const list = await Rol.find(query).sort({ nombre_rol: 1 });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listar roles filtrados por un restaurante específico (mantén esta ruta, pero ahora usa el campo directo)
router.get('/restaurante/:restauranteId', async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const rolesFiltrados = await Rol.find({  // 👈 CAMBIADO: Filtra directamente por restaurante_id, no por cargos
      restaurante_id: restauranteId
    }).sort({ nombre_rol: 1 });
    res.json(rolesFiltrados);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener uno (agrega filtro si se pasa restaurante)
router.get('/:id', async (req, res) => {
  try {
    let query: any = { _id: req.params.id };
    if (req.query.restaurante_id) {  // 👈 NUEVO: Verifica que pertenezca al restaurante
      query.restaurante_id = req.query.restaurante_id;
    }
    const doc = await Rol.findOne(query);
    if (!doc) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

// Crear (agrega restaurante_id requerido)
router.post('/', async (req, res) => {
  try {
    const { rol_id, nombre_rol, estado, accesos, restaurante_id } = req.body;  // 👈 AGREGADO: restaurante_id
    if (!rol_id || !nombre_rol || !restaurante_id) {  // 👈 Requerido
      return res.status(400).json({ error: 'rol_id, nombre_rol y restaurante_id requeridos' });
    }
    // Verifica que el restaurante exista
    const restaurante = await Restaurante.findById(restaurante_id);
    if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });
    
    // Chequeo de duplicado SOLO por nombre y restaurante (permite mismo nombre en otros rests)
    const exists = await Rol.findOne({ nombre_rol, restaurante_id });
    if (exists) return res.status(409).json({ error: `El rol "${nombre_rol}" ya existe en este restaurante.` });
    
    const doc = new Rol({ rol_id, nombre_rol, estado, accesos, restaurante_id });
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar (actualiza solo si pertenece al restaurante)
router.put('/:id', async (req, res) => {
  try {
    const { restaurante_id } = req.body;  // 👈 Para verificar
    const query: any = { _id: req.params.id };
    if (restaurante_id) query.restaurante_id = restaurante_id;
    
    const updated = await Rol.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar (verifica restaurante)
router.delete('/:id', async (req, res) => {
  try {
    let query: any = { _id: req.params.id };
    if (req.query.restaurante_id) query.restaurante_id = req.query.restaurante_id;
    
    const deleted = await Rol.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json({ message: 'Rol eliminado' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;