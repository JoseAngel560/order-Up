"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = void 0;
// food-backend/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
let bucket; // FIX: Tipo explícito (undefined si no inicializa)
// --- INICIO DE LA INTEGRACIÓN DE FIREBASE ---
const admin = __importStar(require("firebase-admin"));
// Esta es la ruta donde Render pondrá tu archivo secreto
// Usamos un try-catch por si acaso no existe en desarrollo local
let bucket; // FIX: Tipo explícito (undefined si no inicializa)try {
const serviceAccount = require('../firebase-service-account.json'); // Asumiendo que está en la RAÍZ
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'joseangel-5dfd2.firebasestorage.app' // <-- ¡TU BUCKET URL!
});
exports.bucket = bucket = admin.storage().bucket();
console.log('Firebase Admin SDK inicializado correctamente');
try { }
catch (error) {
    console.warn('ADVERTENCIA: No se pudo inicializar Firebase Admin SDK.');
    console.warn('Esto es normal en desarrollo si firebase-service-account.json no existe.');
    console.warn('Error:', error.message);
}
// --- FIN DE LA INTEGRACIÓN DE FIREBASE ---
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- COMENTADO: Ya no usamos uploads local (evita error 500 en Render) ---
// app.use('/uploads', express.static('uploads'));
// --- Configuración de Socket.io ---
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.use((req, res, next) => {
    req.io = io;
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
        const [empleadoRoutes, facturaRoutes, mesaRoutes, pedidoRoutes, productoRoutes, // <-- Esta es la ruta que modificaremos
        restauranteRoutes, rolRoutes, usuarioRoutes, reservacionesRoutes, dashboardRoutes, notificationRoutes, reportesinfoRoutes, reportesVentasRoutes, arqueoRoutes, // Operaciones de caja (abrir/cerrar)
        reportesArqueoRoutes // <--- NUEVO: Reportes históricos de caja
        ] = await Promise.all([
            Promise.resolve().then(() => __importStar(require('./routes/empleadoRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/facturaRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/mesaRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/pedidoRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/productoRoutes'))).then(m => m.default), // <-- ¡Importante!
            Promise.resolve().then(() => __importStar(require('./routes/restauranteRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/rolRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/usuarioRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/reservacionesRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/dashboardRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/notificationRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/reportesinfoRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/reportesVentasRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/arqueoRoutes'))).then(m => m.default),
            Promise.resolve().then(() => __importStar(require('./routes/reportesArqueoRoutes'))).then(m => m.default) // <--- CARGADO
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
    }
    catch (err) {
        console.error('Error cargando rutas:', err.message);
        process.exit(1);
    }
}
mongoose_1.default.connect(process.env.MONGO_URI || '')
    .then(() => console.log('MongoDB conectado localmente'))
    .catch((err) => {
    console.error('Error MongoDB:', err);
    process.exit(1);
});
mongoose_1.default.connection.on('connected', async () => {
    console.log('Evento "connected" disparado – iniciando limpieza...');
    if (process.env.NODE_ENV === 'development') {
        console.log('Modo dev detectado – procediendo con limpieza auto');
        try {
            if (!mongoose_1.default.connection.db)
                return;
            const indexes = await mongoose_1.default.connection.db.collection('pedidos').indexes();
            const oldIndex = indexes.find(idx => idx.name === 'pedido_id_1');
            if (oldIndex) {
                await mongoose_1.default.connection.db.collection('pedidos').dropIndex('pedido_id_1');
                console.log('Índice viejo "pedido_id_1" eliminado automáticamente');
            }
            try {
                await mongoose_1.default.connection.db.collection('pedidos').createIndex({ restaurante_id: 1, pedido_id: 1 }, { unique: true });
                console.log('Nuevo índice compuesto creado. ¡Listo para rockear!');
            }
            catch (createErr) {
                if (createErr?.code !== 85)
                    throw createErr;
            }
        }
        catch (err) {
            console.error('Error en limpieza auto:', err);
        }
    }
});
loadRoutes();
app.get('/', (_, res) => res.send('API Food Gestor - Listo'));
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server en puerto ${PORT}`));
