import { Router } from 'express';
import Arqueo from '../models/Arqueo';
import Factura from '../models/Factura';
import Usuario from '../models/Usuario';
import Restaurante from '../models/Restaurante'; // <-- IMPORTADO

const router = Router();

// --- 1. VERIFICAR ESTADO DE CAJA DEL USUARIO ACTUAL ---
router.get('/mi-caja', async (req, res) => {
    try {
        const { restaurante_id, cajero_id } = req.query;
        if (!restaurante_id || !cajero_id) {
             return res.status(400).json({ error: 'Faltan parámetros restaurante_id o cajero_id' });
        }

        const arqueoAbierto = await Arqueo.findOne({ 
            restaurante_id, 
            cajero_apertura_id: cajero_id,
            estado: 'Abierta' 
        });

        res.json({ abierto: !!arqueoAbierto, arqueo: arqueoAbierto });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- 2. ABRIR CAJA (ACTUALIZADO) ---
router.post('/abrir', async (req, res) => {
    try {
        const { restaurante_id, cajero_id, monto_inicial } = req.body;
        
        // Validar que el restaurante existe para leer su config
        const restaurante = await Restaurante.findById(restaurante_id);
        if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });

        // Validar que el usuario existe para obtener su nombre
        const cajero = await Usuario.findById(cajero_id);
        if (!cajero) return res.status(404).json({ error: 'Cajero no encontrado' });

        // Verificar si YA tiene una caja abierta
        const yaAbierta = await Arqueo.findOne({ restaurante_id, cajero_apertura_id: cajero_id, estado: 'Abierta' });
        if (yaAbierta) return res.status(400).json({ error: 'Ya tienes una caja abierta.' });

        const nuevoArqueo = new Arqueo({
            restaurante_id,
            cajero_apertura_id: cajero_id,
            cajero_nombre: cajero.nombreusuario, // Guardamos el nombre para reportes
            monto_inicial: monto_inicial || 0,
            fecha_apertura: new Date(),
            estado: 'Abierta',
            
            // --- CONGELAR MONEDA Y TASA ---
            moneda_base_historica: restaurante.configuracion.moneda,
            tasa_cambio_historica: restaurante.configuracion.tasa_cambio
        });

        await nuevoArqueo.save();
        res.status(201).json(nuevoArqueo);
    } catch (error: any) {
        // Capturar error de índice único por si acaso
        if (error.code === 11000) {
             return res.status(400).json({ error: 'Ya tienes una caja abierta.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// --- 3. PRE-CIERRE (Calcular totales en tiempo real) ---
router.get('/precierre/:arqueo_id', async (req, res) => {
    try {
        const arqueo = await Arqueo.findById(req.params.arqueo_id);
        if (!arqueo || arqueo.estado !== 'Abierta') {
            return res.status(404).json({ error: 'Caja no encontrada o ya cerrada' });
        }

        // Sumar todas las facturas de ESTE cajero desde que abrió ESTA caja
        const ventas = await Factura.aggregate([
            {
                $match: {
                    restaurante_id: arqueo.restaurante_id,
                    cajero_id: arqueo.cajero_apertura_id, // IMPORTANTE: Solo sus propias ventas
                    fecha: { $gte: arqueo.fecha_apertura.toISOString() }
                    // IMPORTANTE: Esta suma asume que todas las facturas están en la MISMA MONEDA
                    // que el arqueo. Si un arqueo sobrevive a un cambio de moneda, este cálculo será incorrecto.
                    // La lógica correcta implicaría normalizar las facturas aquí.
                }
            },
            {
                $group: {
                    _id: null,
                    totalEfectivo: { 
                        $sum: { 
                            $cond: [{ $in: ["$metodo_pago", ["Efectivo", "Ambos"]] }, "$Total", 0] 
                        } 
                    },
                    totalTarjeta: { 
                        $sum: { 
                            $cond: [{ $eq: ["$metodo_pago", "Transferencia"] }, "$Total", 0] 
                        } 
                    }
                }
            }
        ]);

        const efectivoVentas = ventas[0]?.totalEfectivo || 0;
        const tarjetaVentas = ventas[0]?.totalTarjeta || 0;
        
        const totalEsperado = arqueo.monto_inicial + efectivoVentas;

        res.json({
            monto_inicial: arqueo.monto_inicial,
            ventas_efectivo: efectivoVentas,
            ventas_tarjeta: tarjetaVentas,
            total_esperado: totalEsperado
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- 4. CERRAR CAJA (Definitivo) ---
router.post('/cerrar/:arqueo_id', async (req, res) => {
    try {
        const { monto_final_real, notas } = req.body;

        const arqueo = await Arqueo.findById(req.params.arqueo_id);
        if (!arqueo || arqueo.estado !== 'Abierta') return res.status(404).json({ error: 'Caja inválida para cierre' });

        // 1. Recalcular totales finales (igual que en pre-cierre, por seguridad)
        const fechaCierre = new Date();
        const ventas = await Factura.aggregate([
            {
                $match: {
                    restaurante_id: arqueo.restaurante_id,
                    cajero_id: arqueo.cajero_apertura_id,
                    fecha: { 
                        $gte: arqueo.fecha_apertura.toISOString(),
                        $lte: fechaCierre.toISOString() 
                    }
                    // APLICA LA MISMA ADVERTENCIA QUE EN PRE-CIERRE
                }
            },
            {
                $group: {
                    _id: null,
                    totalEfectivo: { $sum: { $cond: [{ $in: ["$metodo_pago", ["Efectivo", "Ambos"]] }, "$Total", 0] } },
                    totalTarjeta: { $sum: { $cond: [{ $eq: ["$metodo_pago", "Transferencia"] }, "$Total", 0] } }
                }
            }
        ]);

        const efectivoSistema = ventas[0]?.totalEfectivo || 0;
        const tarjetaSistema = ventas[0]?.totalTarjeta || 0;
        const esperado = arqueo.monto_inicial + efectivoSistema;
        const diferencia = monto_final_real - esperado;

        // 2. Actualizar y cerrar Arqueo
        arqueo.fecha_cierre = fechaCierre;
        arqueo.cajero_cierre_id = arqueo.cajero_apertura_id;
        arqueo.ventas_efectivo_sistema = efectivoSistema;
        arqueo.ventas_tarjeta_sistema = tarjetaSistema;
        arqueo.monto_final_esperado = esperado;
        arqueo.monto_final_real = monto_final_real;
        arqueo.diferencia = diferencia;
        arqueo.estado = 'Cerrada';
        arqueo.notas = notas;

        await arqueo.save();

        res.json({ message: 'Caja cerrada correctamente', arqueo });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- 5. RUTA DE VALIDACIÓN: VERIFICAR SI HAY ARQUEO ABIERTO ---
router.get('/abierto/:restaurante_id', async (req, res) => {
    try {
        const { restaurante_id } = req.params;

        const arqueoAbierto = await Arqueo.findOne({
            restaurante_id: restaurante_id,
            estado: 'Abierta' 
        });

        // Devuelve true si existe (!!arqueoAbierto), false si es null
        res.json({ hasOpenArqueo: !!arqueoAbierto }); 

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;