// food-backend/routes/notificationRoutes.ts
import { Router } from 'express';
import Notification from '../models/Notification'; // (Usando el nombre de tu modelo)
import mongoose from 'mongoose';

const router = Router();

// GET /api/notificaciones?restaurante_id=... (Sin cambios)
router.get('/', async (req, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id) {
        return res.status(400).json({ error: 'El restaurante_id es requerido' });
    }

    const notificaciones = await Notification.find({ 
        restaurante_id: new mongoose.Types.ObjectId(restaurante_id as string) 
    })
      .sort({ fecha: -1 }) 
      .limit(50); 
    res.json(notificaciones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// --- ¡CORRECCIÓN! LA RUTA '/all' VA PRIMERO ---
// ===============================================
router.delete('/all', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido para borrar todo' });
        }

        const result = await Notification.deleteMany({
            restaurante_id: new mongoose.Types.ObjectId(restaurante_id as string) 
        });

        console.log(`Se eliminaron ${result.deletedCount} notificaciones para el restaurante ${restaurante_id}`);
        res.json({ message: 'Todas las notificaciones han sido eliminadas' });

    } catch (err: any) {
        res.status(500).json({ error: 'Error al eliminar notificaciones: ' + err.message });
    }
});
// ===============================================


// --- LA RUTA '/:id' VA DESPUÉS ---
router.delete('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }

        const deleted = await Notification.findOneAndDelete({ 
            _id: req.params.id, 
            restaurante_id: new mongoose.Types.ObjectId(restaurante_id as string) 
        });

        if (!deleted) return res.status(404).json({ error: 'Notificación no encontrada' });
        res.json({ message: 'Notificación eliminada' });
    } catch (err: any) {
        res.status(400).json({ error: 'ID inválido' });
    }
});


export default router;