// food-backend/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

// --- INICIO DE LA INTEGRACIÓN DE FIREBASE ---
import * as admin from 'firebase-admin';

// Esta es la ruta donde Render pondrá tu archivo secreto
// Usamos un try-catch por si acaso no existe en desarrollo local
let bucket;
try {
  const serviceAccount = require('../firebase-service-account.json'); // Asumiendo que está en la RAÍZ

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'joseangel-5dfd2.firebasestorage.app' // <-- ¡TU BUCKET URL!
  });

  bucket = admin.storage().bucket();
  console.log('Firebase Admin SDK inicializado correctamente');
} catch (error: any) {
  console.warn('ADVERTENCIA: No se pudo inicializar Firebase Admin SDK.');
  console.warn('Esto es normal en desarrollo si firebase-service-account.json no existe.');
  console.warn('Error:', error.message);
}
// Exportamos el bucket para usarlo en las rutas
export { bucket };
// --- FIN DE LA INTEGRACIÓN DE FIREBASE ---


const app: Application = express();
app.use(cors());
app.use(express.json());

// Esta línea es la que causa el error 500. Render no puede guardar archivos así.
// La dejaremos por ahora, pero la ruta de productos ya no la usará.
app.use('/uploads', express.static('uploads'));

// --- Configuración de Socket.io ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('🔌 Nuevo cliente conectado:', socket.id);

  socket.on('joinRoom', (restauranteId) => {
    socket.join(restauranteId);
    console.log(`Cliente ${socket.id} se unió a la sala ${restauranteId}`);
  });

  socket.on('disconnect', () => {
    console.log('🚫 Cliente desconectado:', socket.id);
  });
});

async function loadRoutes() {
  try {
    const [
      empleadoRoutes,
      facturaRoutes,
      mesaRoutes,
      pedidoRoutes,
      productoRoutes, // <-- Esta es la ruta que modificaremos
      restauranteRoutes,
      rolRoutes,
      usuarioRoutes,
      reservacionesRoutes,
      dashboardRoutes,
      notificationRoutes,
      reportesinfoRoutes,
      reportesVentasRoutes,
      arqueoRoutes,           // Operaciones de caja (abrir/cerrar)
      reportesArqueoRoutes    // <--- NUEVO: Reportes históricos de caja
    ] = await Promise.all([
      import('./routes/empleadoRoutes').then(m => m.default),
      import('./routes/facturaRoutes').then(m => m.default),
      import('./routes/mesaRoutes').then(m => m.default),
      import('./routes/pedidoRoutes').then(m => m.default),
      import('./routes/productoRoutes').then(m => m.default), // <-- ¡Importante!
      import('./routes/restauranteRoutes').then(m => m.default),
      import('./routes/rolRoutes').then(m => m.default),
      import('./routes/usuarioRoutes').then(m => m.default),
      import('./routes/reservacionesRoutes').then(m => m.default),
      import('./routes/dashboardRoutes').then(m => m.default),
      import('./routes/notificationRoutes').then(m => m.default),
      import('./routes/reportesinfoRoutes').then(m => m.default),
      import('./routes/reportesVentasRoutes').then(m => m.default),
      import('./routes/arqueoRoutes').then(m => m.default),
      import('./routes/reportesArqueoRoutes').then(m => m.default) // <--- CARGADO
    ]);

    app.use('/api/empleados', empleadoRoutes);
    app.use('/api/facturas', facturaRoutes);
    app.use('/api/mesas', mesaRoutes);
    app.use('/api/pedidos', pedidoRoutes);
    app.use('/api/productos', productoRoutes); // <-- Esta ruta ahora usará Firebase
    app.use('/api/restaurantes', restauranteRoutes);
    app.use('/api/roles', rolRoutes);
    app.use('/api/usuarios', usuarioRoutes);
    app.use('/api/reservaciones', reservacionesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/notificaciones', notificationRoutes);
    app.use('/api/reportes-info', reportesinfoRoutes);
    app.use('/api/reportes-ventas', reportesVentasRoutes);
    app.use('/api/arqueos', arqueoRoutes);
    
    // --- NUEVO REGISTRO ---
    app.use('/api/reportes-arqueos', reportesArqueoRoutes);

    console.log('Todas las rutas cargadas exitosamente');
  } catch (err: any) {
    console.error('Error cargando rutas:', err.message);
    process.exit(1);
  }
}

mongoose.connect(process.env.MONGO_URI || '')
  .then(() => console.log('MongoDB conectado localmente')) 
  .catch((err) => { 
    console.error('Error MongoDB:', err); 
    process.exit(1); 
  });

mongoose.connection.on('connected', async () => {
  console.log('Evento "connected" disparado – iniciando limpieza...');
  if (process.env.NODE_ENV === 'development') {
    console.log('Modo dev detectado – procediendo con limpieza auto');
    try {
      if (!mongoose.connection.db) return;
      const indexes = await mongoose.connection.db.collection('pedidos').indexes();
      const oldIndex = indexes.find(idx => idx.name === 'pedido_id_1');
      if (oldIndex) {
        await mongoose.connection.db.collection('pedidos').dropIndex('pedido_id_1');
        console.log('Índice viejo "pedido_id_1" eliminado automáticamente');
      }
      try {
        await mongoose.connection.db.collection('pedidos').createIndex(
          { restaurante_id: 1, pedido_id: 1 },
          { unique: true }
        );
        console.log('Nuevo índice compuesto creado. ¡Listo para rockear!');
      } catch (createErr: any) {
        if (createErr?.code !== 85) throw createErr;
      }
    } catch (err) {
      console.error('Error en limpieza auto:', err);
    }
  }
});

loadRoutes();

app.get('/', (_, res) => res.send('API Food Gestor - Listo'));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server en puerto ${PORT}`));