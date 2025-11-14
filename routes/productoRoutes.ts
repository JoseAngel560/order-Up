// food-backend/routes/productoRoutes.ts
import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import Producto from '../models/Producto';
import Notification from '../models/Notification';
import multer from 'multer';
import { bucket } from '../firebaseConfig'; // Import simple

const router = Router();

// --- CONFIGURACIÓN DE MULTER EN MEMORIA (para Firebase) ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// FIX: Tipo correcto para el archivo de multer
type MulterFile = Express.Multer.File;

// Función helper para subir a Firebase (simple, sin tipos locos)
async function uploadToFirebase(file: MulterFile): Promise<string | null> {
  if (!bucket) {
    throw new Error('Firebase no inicializado');
  }

  const fileName = `productos/${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(fileName);

  await fileUpload.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000'
    }
  });

  await fileUpload.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  return publicUrl;
}

// --- RUTAS GET (iguales) ---
router.get('/', async (req: Request<ParamsDictionary, any, any>, res: Response) => {
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

router.get('/restaurante/:id', async (req: Request<ParamsDictionary, any, any>, res: Response) => {
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

router.get('/:id', async (req: Request<ParamsDictionary, any, any>, res: Response) => {
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

// --- POST CON FIREBASE ---
router.post('/', upload.single('imagen'), async (req: Request<ParamsDictionary, any, any>, res: Response) => {
    try {
        const { producto_id, nombre, descripcion, categoria, precio, disponible, restaurante_id, moneda } = req.body;

        if (!producto_id || !nombre || !categoria || !precio || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos faltantes' });
        }
        
        let imagenURL = null;
        if (req.file) {
            imagenURL = await uploadToFirebase(req.file as MulterFile); // FIX: Cast correcto
            console.log('Imagen subida a Firebase:', imagenURL);
        }

        const doc = new Producto({ 
            producto_id, nombre, descripcion, categoria, precio, disponible, imagenURL, 
            restaurante_id, moneda: moneda || 'NIO'
        });
        const saved = await doc.save();
        const populated = await Producto.findById(saved._id).populate('restaurante_id');
        res.status(201).json(populated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUT CON FIREBASE ---
router.put('/:id', upload.single('imagen'), async (req: Request<ParamsDictionary, any, any>, res: Response) => {
    try {
        const productoAnterior = await Producto.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const precioAnterior = productoAnterior.precio;
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id;

        const body = { ...req.body };
        if (req.file) {
            const nuevaImagenURL = await uploadToFirebase(req.file as MulterFile); // FIX: Cast correcto
            body.imagenURL = nuevaImagenURL;
            console.log('Nueva imagen subida a Firebase:', nuevaImagenURL);
        }
        if (body.moneda) {
            body.moneda = body.moneda;
        }

        const updated = await Producto.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).populate('restaurante_id');
        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Lógica de Notificación
        try {
            const io = (req as any).io;
            let notifMensaje = '';
            const nuevoPrecio = updated.precio;
            const nuevoDisponible = updated.disponible;

            if (precioAnterior !== nuevoPrecio) {
                notifMensaje = `El precio de '${updated.nombre}' cambió a C$ ${nuevoPrecio.toFixed(2)}.`;
            } 
            else if (disponibleAnterior !== nuevoDisponible) {
                notifMensaje = `El producto '${updated.nombre}' ahora está ${nuevoDisponible ? 'Disponible' : 'Agotado'}.`;
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
            console.error("Error en notificación:", notifError);
        }

        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// --- DELETE (igual) ---
router.delete('/:id', async (req: Request<ParamsDictionary, any, any>, res: Response) => {
    try {
        const deleted = await Producto.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado' });
    } catch (err: any) {
        res.status(400).json({ error: 'ID inválido' });
    }
});

// --- PATCH (igual) ---
router.patch('/:id/disponible', async (req: Request<ParamsDictionary, any, any>, res: Response) => {
    try {
        const { disponible } = req.body; 
        if (typeof disponible !== 'boolean') {
            return res.status(400).json({ error: 'El estado "disponible" (true/false) es requerido.' });
        }

        const productoAnterior = await Producto.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id;

        const updated = await Producto.findByIdAndUpdate(
            req.params.id,
            { disponible: disponible }, 
            { new: true, runValidators: true }
        ).populate('restaurante_id');

        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Lógica de Notificación
        try {
            const io = (req as any).io;
            let notifMensaje = '';

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
            console.error("Error en notificación:", notifError);
        }

        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;