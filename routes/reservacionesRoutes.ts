// food-backend/routes/reservacionesRoutes.ts
import { Router, Request } from 'express'; // <-- AÑADIDO: 'Request'
import mongoose from 'mongoose'; 
import Reservacion from '../models/Reservacion';
import Notification from '../models/Notification'; // <-- 1. AÑADIDO: Importa Notificación

const router = Router();

// Obtener TODAS (Tu código - Sin cambios)
router.get('/', async (req, res) => {
  try {
    const { fecha, restaurante_id, mesa_id } = req.query; 
    
    let filtro: any = {};
    if (fecha) filtro.fecha = fecha;
    if (restaurante_id) filtro.restaurante_id = new mongoose.Types.ObjectId(restaurante_id as string);
    if (mesa_id) {
      try {
        filtro.mesa_id = new mongoose.Types.ObjectId(mesa_id as string);
      } catch (err) {
        return res.status(400).json({ error: 'ID de mesa inválido' });
      }
    }

    const list = await Reservacion.find(filtro)
      .populate('mesa_id')
      .populate('restaurante_id')
      .sort({ fecha: 1, hora: 1 });
      
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- **Crear (MODIFICADO PARA NOTIFICAR)** ---
router.post('/', async (req: Request, res) => { // <-- AÑADIDO: 'Request'
  try {
    const { mesa_id, restaurante_id, fecha, hora, nombre_cliente, telefono } = req.body;
    
    // (Tu lógica de validación - Sin cambios)
    // const existe = await Reservacion.findOne({ mesa_id, fecha, hora });
    // if (existe) return res.status(409).json({ error: 'Mesa ya reservada a esa hora' });

    const doc = new Reservacion({ ...req.body, estado: 'Pendiente' });
    const saved = await doc.save();
    const populated = await Reservacion.findById(saved._id)
      .populate('mesa_id')
      .populate('restaurante_id');
      
    // ===============================================
    // --- 2. AÑADIDO: Lógica de Notificación ---
    // ===============================================
    try {
        const io = (req as any).io;
        // Obtenemos el número de la mesa del objeto 'populated'
        const numeroMesa = (populated?.mesa_id as any)?.numero; // Hacemos type assertion
        
        if (io && restaurante_id && numeroMesa) {
            const notif = new Notification({
                mensaje: `Nueva reservación en Mesa #${numeroMesa} para las ${hora}`,
                tipo: 'mesa', // Usamos el tipo 'mesa'
                restaurante_id: restaurante_id
            });
            await notif.save();
            io.to(restaurante_id.toString()).emit('nuevaNotificacion', notif);
            console.log(`Notificación de reservación emitida para Mesa #${numeroMesa}`);
        }
    } catch (notifError) {
        console.error("Error creando/emitiendo notificación de reservación:", notifError);
    }
    // --- FIN: Lógica de Notificación ---

    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar una reservación (Tu código - Sin cambios)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Reservacion.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('mesa_id')
      .populate('restaurante_id');
      
    if (!updated) return res.status(404).json({ error: 'Reservación no encontrada' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar una reservación (Tu código - Sin cambios)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Reservacion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Reservación no encontrada' });
    res.json({ message: 'Reservación eliminada' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;