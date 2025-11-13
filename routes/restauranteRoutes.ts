import { Router } from 'express';
import Restaurante from '../models/Restaurante';

const router = Router();

// Listar todos
router.get('/', async (req, res) => {
  try {
    const list = await Restaurante.find().sort({ nombre_restaurante: 1 });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener uno
router.get('/:id', async (req, res) => {
  try {
    const doc = await Restaurante.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

// Crear (ACTUALIZADO)
router.post('/', async (req, res) => {
  try {
    const { 
        restaurante_id, nombre_restaurante, direccion, telefono, // <--- RECIBIR TELEFONO
        mesas, cargos_seleccionados, servicios_disponibles, configuracion 
    } = req.body;

    // Validar que venga el telefono
    if (!restaurante_id || !nombre_restaurante || !direccion || !telefono || !mesas) {
      return res.status(400).json({ error: 'Campos requeridos faltantes (incluyendo teléfono)' });
    }

    const doc = new Restaurante({ 
        restaurante_id, nombre_restaurante, direccion, telefono, // <--- GUARDAR TELEFONO
        mesas, cargos_seleccionados, servicios_disponibles, configuracion 
    });
    
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err: any) {
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

    const updated = await Restaurante.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Restaurante.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json({ message: 'Restaurante eliminado' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;