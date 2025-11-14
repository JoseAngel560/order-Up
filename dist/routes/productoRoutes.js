"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// food-backend/routes/productoRoutes.ts
const express_1 = require("express"); // FIX: Añadido Response para tipar res
const Producto_1 = __importDefault(require("../models/Producto"));
const Notification_1 = __importDefault(require("../models/Notification")); // <-- AÑADIDO: Modelo de Notificación
const multer_1 = __importDefault(require("multer"));
// --- IMPORT NUEVO: Bucket de Firebase desde index.ts ---
const index_1 = require("../index"); // FIX: TS ahora lo ve como Bucket | undefined gracias a index.ts
// --- CONFIGURACIÓN DE MULTER CAMBIADA A MEMORIA (para Firebase) ---
const storage = multer_1.default.memoryStorage(); // <-- CAMBIO: En memoria, no en disco
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Opcional: Límite de 5MB por imagen
});
// Función helper para subir a Firebase (nueva) - FIX: Tipos explícitos
async function uploadToFirebase(file) {
    if (!index_1.bucket) {
        throw new Error('Firebase bucket no inicializado');
    }
    const fileName = `productos/${Date.now()}-${file.originalname}`; // Carpeta 'productos/' para organización
    const fileUpload = index_1.bucket.file(fileName);
    // Subir el buffer
    await fileUpload.save(file.buffer, {
        metadata: {
            contentType: file.mimetype,
            cacheControl: 'public, max-age=31536000' // Cache de 1 año
        }
    });
    // Hacer público
    await fileUpload.makePublic();
    // Generar URL pública
    const publicUrl = `https://storage.googleapis.com/${index_1.bucket.name}/${fileName}`;
    return publicUrl;
}
const router = (0, express_1.Router)(); // FIX: Asegurado que esté aquí, al inicio de las rutas
// --- RUTAS GET (SIN CAMBIOS, pero con tipos) ---
router.get('/', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const list = await Producto_1.default.find({ restaurante_id })
            .populate('restaurante_id')
            .sort({ nombre: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- NUEVA RUTA: Listar productos por restaurante (para convertProducts en frontend) ---
router.get('/restaurante/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const list = await Producto_1.default.find({ restaurante_id: id })
            .populate('restaurante_id')
            .sort({ nombre: 1 });
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const doc = await Producto_1.default.findOne({
            _id: req.params.id,
            restaurante_id
        }).populate('restaurante_id');
        if (!doc)
            return res.status(404).json({ error: 'Producto no encontrado o no pertenece a este restaurante' });
        res.json(doc);
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// --- RUTA CREAR (POST) ACTUALIZADA PARA FIREBASE ---
router.post('/', upload.single('imagen'), async (req, res) => {
    try {
        const { producto_id, nombre, descripcion, categoria, precio, disponible, restaurante_id, moneda } = req.body;
        if (!producto_id || !nombre || !categoria || !precio || !restaurante_id) {
            return res.status(400).json({ error: 'Campos requeridos faltantes' });
        }
        let imagenURL = null;
        if (req.file) {
            // --- CAMBIO: Subir a Firebase en vez de local ---
            imagenURL = await uploadToFirebase(req.file); // FIX: Cast para tipo
            console.log('Imagen subida a Firebase:', imagenURL); // Para debug
        }
        const doc = new Producto_1.default({
            producto_id, nombre, descripcion, categoria, precio, disponible, imagenURL,
            restaurante_id, moneda: moneda || 'NIO' // Default a NIO si no se envía
        });
        const saved = await doc.save();
        const populated = await Producto_1.default.findById(saved._id).populate('restaurante_id');
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ===============================================
// --- RUTA ACTUALIZAR (PUT) ACTUALIZADA PARA FIREBASE ---
// ===============================================
router.put('/:id', upload.single('imagen'), async (req, res) => {
    try {
        // --- 1. Obtener estado anterior ---
        const productoAnterior = await Producto_1.default.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const precioAnterior = productoAnterior.precio;
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id; // Para el socket
        // --- 2. Preparar actualización (Tu lógica + soporte para moneda) ---
        const body = { ...req.body };
        if (req.file) {
            // --- CAMBIO: Subir nueva imagen a Firebase ---
            const nuevaImagenURL = await uploadToFirebase(req.file); // FIX: Cast
            body.imagenURL = nuevaImagenURL;
            console.log('Nueva imagen subida a Firebase:', nuevaImagenURL); // Para debug
        }
        // Soporte explícito para moneda si se envía
        if (body.moneda) {
            body.moneda = body.moneda; // Ya está en body, pero valida enum si quieres
        }
        // --- 3. Actualizar (Tu lógica) ---
        const updated = await Producto_1.default.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).populate('restaurante_id');
        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        // --- 4. AÑADIDO: Lógica de Notificación ---
        try {
            const io = req.io;
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
                const notif = new Notification_1.default({
                    mensaje: notifMensaje,
                    tipo: 'inventario', // Tipo 'inventario'
                    restaurante_id: restauranteId
                });
                await notif.save();
                io.to(restauranteId.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de producto emitida: ${notifMensaje}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo notificación de producto:", notifError);
        }
        // --- FIN: Lógica de Notificación ---
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// --- RUTA DELETE (sin cambios, pero con tipos) ---
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Producto_1.default.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado' });
    }
    catch (err) {
        res.status(400).json({ error: 'ID inválido' });
    }
});
// =================================================================
// --- RUTA PATCH (MODIFICADA) ---
// =================================================================
router.patch('/:id/disponible', async (req, res) => {
    try {
        const { disponible } = req.body;
        if (typeof disponible !== 'boolean') {
            return res.status(400).json({ error: 'El estado "disponible" (true/false) es requerido.' });
        }
        // --- 1. Obtener estado anterior ---
        const productoAnterior = await Producto_1.default.findById(req.params.id);
        if (!productoAnterior) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const disponibleAnterior = productoAnterior.disponible;
        const restauranteId = productoAnterior.restaurante_id;
        // --- 2. Actualizar ---
        const updated = await Producto_1.default.findByIdAndUpdate(req.params.id, { disponible: disponible }, { new: true, runValidators: true }).populate('restaurante_id');
        if (!updated) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        // --- 3. AÑADIDO: Lógica de Notificación ---
        try {
            const io = req.io;
            let notifMensaje = '';
            // Chequear si la disponibilidad realmente cambió
            if (disponibleAnterior !== updated.disponible) {
                notifMensaje = `El producto '${updated.nombre}' ahora está ${updated.disponible ? 'Disponible' : 'Agotado'}.`;
            }
            if (notifMensaje && io) {
                const notif = new Notification_1.default({
                    mensaje: notifMensaje,
                    tipo: 'inventario',
                    restaurante_id: restauranteId
                });
                await notif.save();
                io.to(restauranteId.toString()).emit('nuevaNotificacion', notif);
                console.log(`Notificación de producto emitida: ${notifMensaje}`);
            }
        }
        catch (notifError) {
            console.error("Error creando/emitiendo notificación de producto:", notifError);
        }
        // --- FIN: Lógica de Notificación ---
        res.json(updated); // Devuelve el producto actualizado
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =================================================================
// --- FIN DE LA CORRECCIÓN ---
// =================================================================
exports.default = router;
