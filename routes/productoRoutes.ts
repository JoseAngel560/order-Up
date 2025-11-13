// food-backend/routes/productoRoutes.ts
import { Router, Request } from 'express'; // <-- AÑADIDO: 'Request'
import Producto from '../models/Producto';
import Notification from '../models/Notification'; // <-- AÑADIDO: Modelo de Notificación
import multer from 'multer';
import path from 'path';

const router = Router();

// --- CONFIGURACIÓN MEJORADA DE MULTER (sin cambios) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// --- RUTAS GET (ACTUALIZADAS) ---
router.get('/', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const list = await Producto.find({ restaurante_id })
            .populate('restaurante_id')
            .sort({ nombre: 1 });
        res.json(list);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- NUEVA RUTA: Listar productos por restaurante (para convertProducts en frontend) ---
router.get('/restaurante/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const list = await Producto.find({ restaurante_id: id })
            .populate('restaurante_id')
            .sort({ nombre: 1 });
        res.json(list);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const doc = await Producto.findOne({ 
            _id: req.params.id, 
            restaurante_id 
        }).populate('restaurante_id');
        if (!doc) return res.status(404).json({ error: 'Producto no encontrado o no pertenece a este restaurante' });
        res.json(doc);
    } catch (err: any) {
        res.status(400).json({ error: 'ID inválido' });
    }
});

// --- RUTA CREAR (POST) (ACTUALIZADA PARA MONEDA) ---
router.post('/', upload.single('imagen'), async (req, res) => {
    try {
        const { producto_id, nombre, descripcion, categoria, precio, disponible, restaurante_id, moneda } = req.body;

        if (!producto_id || !nombre || !categoria || !precio || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos faltantes' });
        }
        
        let imagenURL = null;
        if (req.file) {
            const serverAddress = `${req.protocol}://${req.get('host')}`;
            imagenURL = `${serverAddress}/uploads/${req.file.filename}`;
        }

        const doc = new Producto({ 
            producto_id, nombre, descripcion, categoria, precio, disponible, imagenURL, 
            restaurante_id, moneda: moneda || 'NIO' // Default a NIO si no se envía
        });
        const saved = await doc.save();
        const populated = await Producto.findById(saved._id).populate('restaurante_id');
        res.status(201).json(populated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// ===============================================
// --- RUTA ACTUALIZAR (PUT) (MODIFICADA PARA MONEDA) ---
// ===============================================
router.put('/:id', upload.single('imagen'), async (req: Request, res) => { // <-- AÑADIDO 'Request'
    try {
        // --- 1. Obtener estado anterior ---
        const productoAnterior = await Producto.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const precioAnterior = productoAnterior.precio;
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id; // Para el socket

        // --- 2. Preparar actualización (Tu lógica + soporte para moneda) ---
        const body = { ...req.body };
        if (req.file) {
            const serverAddress = `${req.protocol}://${req.get('host')}`;
            body.imagenURL = `${serverAddress}/uploads/${req.file.filename}`;
        }
        // Soporte explícito para moneda si se envía
        if (body.moneda) {
            body.moneda = body.moneda; // Ya está en body, pero valida enum si quieres
        }

        // --- 3. Actualizar (Tu lógica) ---
        const updated = await Producto.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).populate('restaurante_id');
        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // --- 4. AÑADIDO: Lógica de Notificación ---
        try {
            const io = (req as any).io;
            let notifMensaje = '';
            const nuevoPrecio = updated.precio;
            const nuevoDisponible = updated.disponible;

            // Chequeo 1: ¿Cambió el precio?
            if (precioAnterior !== nuevoPrecio) {
                notifMensaje = `El precio de '${updated.nombre}' cambió a C$ ${nuevoPrecio.toFixed(2)}.`;
            } 
            // Chequeo 2: ¿Cambió la disponibilidad?
            else if (disponibleAnterior !== nuevoDisponible) {
                notifMensaje = `El producto '${updated.nombre}' ahora está ${nuevoDisponible ? 'Disponible' : 'Agotado'}.`;
            }

            // Si generamos un mensaje, creamos y emitimos la notificación
            if (notifMensaje && io) {
                const notif = new Notification({
                    mensaje: notifMensaje,
                    tipo: 'inventario', // Tipo 'inventario'
                    restaurante_id: restauranteId
                });
                await notif.save();
                io.to(restauranteId.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de producto emitida: ${notifMensaje}`);
            }
        } catch (notifError) {
            console.error("Error creando/emitiendo notificación de producto:", notifError);
        }
        // --- FIN: Lógica de Notificación ---

        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// --- RUTA DELETE (sin cambios) ---
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Producto.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado' });
    } catch (err: any) {
        res.status(400).json({ error: 'ID inválido' });
    }
});


// =================================================================
// --- RUTA PATCH (MODIFICADA) ---
// =================================================================
router.patch('/:id/disponible', async (req: Request, res) => { // <-- AÑADIDO 'Request'
    try {
        const { disponible } = req.body; 
        if (typeof disponible !== 'boolean') {
            return res.status(400).json({ error: 'El estado "disponible" (true/false) es requerido.' });
        }

        // --- 1. Obtener estado anterior ---
        const productoAnterior = await Producto.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id;

        // --- 2. Actualizar ---
        const updated = await Producto.findByIdAndUpdate(
            req.params.id,
            { disponible: disponible }, 
            { new: true, runValidators: true }
        ).populate('restaurante_id');

        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // --- 3. AÑADIDO: Lógica de Notificación ---
        try {
            const io = (req as any).io;
            let notifMensaje = '';

            // Chequear si la disponibilidad realmente cambió
            if (disponibleAnterior !== updated.disponible) {
                notifMensaje = `El producto '${updated.nombre}' ahora está ${updated.disponible ? 'Disponible' : 'Agotado'}.`;
            }

            if (notifMensaje && io) {
                const notif = new Notification({
                    mensaje: notifMensaje,
                    tipo: 'inventario',
                    restaurante_id: restauranteId
                });
                await notif.save();
                io.to(restauranteId.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de producto emitida: ${notifMensaje}`);
            }
        } catch (notifError) {
            console.error("Error creando/emitiendo notificación de producto:", notifError);
        }
        // --- FIN: Lógica de Notificación ---

        res.json(updated); // Devuelve el producto actualizado
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});
// =================================================================
// --- FIN DE LA CORRECCIÓN ---
// =================================================================

export default router;