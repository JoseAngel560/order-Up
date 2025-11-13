// food-backend/routes/reportesinfoRoutes.ts
import { Router } from 'express';
import mongoose from 'mongoose';
import Pedido from '../models/Pedido';
import Factura from '../models/Factura';
import Restaurante from '../models/Restaurante'; // <-- 1. IMPORTAR RESTAURANTE

const router = Router();

// Define el tipo de moneda para TypeScript
type CurrencyType = 'USD' | 'NIO';

router.get('/dashboard', async (req, res) => {
    try {
        const { restaurante_id } = req.query;
        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }
        const restId = new mongoose.Types.ObjectId(restaurante_id as string);

        // --- 1. OBTENER CONFIGURACIÓN ACTUAL DEL RESTAURANTE ---
        const restaurante = await Restaurante.findById(restId);
        if (!restaurante) {
            return res.status(404).json({ error: 'Restaurante no encontrado' });
        }
        
        // Esta es la moneda a la que queremos convertir todos los totales.
        const monedaObjetivo = restaurante.configuracion.moneda as CurrencyType; // Ej: 'NIO'
        
        // ¡¡NO USAREMOS la tasa de cambio actual (tasaObjetivo) para cálculos históricos!!


        // --- 2. DEFINIR RANGOS DE FECHA ---
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const hoyFin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); 
        
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Domingo de esta semana
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // --- 3. OBTENER TODAS LAS FACTURAS DEL MES ---
        const facturasDelMes = await Factura.find({
            restaurante_id: restId,
            fecha: { $gte: startOfMonth.toISOString() } // Traemos todas las del mes
        });

        // --- 4. INICIALIZAR CONTADORES (NORMALIZADOS A LA MONEDA OBJETIVO) ---
        let ventasHoyNormalizado = 0;
        let ventasSemanaNormalizado = 0;
        let ventasMesNormalizado = 0;
        let facturasHoyCount = 0;
        let facturasMesCount = 0;
        
        // --- 5. PROCESAR Y NORMALIZAR CADA FACTURA (LA CORRECCIÓN CLAVE) ---
        for (const f of facturasDelMes) {
            const fechaFactura = new Date(f.fecha);
            
            const total = f.Total;
            const monedaHist = f.moneda_base_historica as CurrencyType;
            const tasaHist = f.tasa_cambio_historica;
            
            let tasaConversion = 1.0;

            // Solo convertimos si la moneda de la venta NO es la moneda base del restaurante
            if (monedaHist !== monedaObjetivo) {
                
                // Caso 1: Venta en USD (Hist), Reporte en NIO (Objetivo)
                // Queremos convertir el USD a NIO
                if (monedaHist === 'USD' && monedaObjetivo === 'NIO') {
                    // ¡¡USAMOS LA TASA HISTÓRICA DE LA VENTA!!
                    tasaConversion = tasaHist; // ej. 36.5
                } 
                // Caso 2: Venta en NIO (Hist), Reporte en USD (Objetivo)
                // Queremos convertir el NIO a USD
                else if (monedaHist === 'NIO' && monedaObjetivo === 'USD') {
                    // ¡¡USAMOS LA TASA HISTÓRICA DE LA VENTA!!
                    tasaConversion = (tasaHist > 0) ? (1 / tasaHist) : 0;
                }
            }
            
            // Aplicamos la tasa (será 1.0 si las monedas coincidían)
            const totalNormalizado = total * tasaConversion;

            // b. Sumar a los contadores
            ventasMesNormalizado += totalNormalizado;
            facturasMesCount++;

            if (fechaFactura >= startOfWeek) {
                ventasSemanaNormalizado += totalNormalizado;
            }
            if (fechaFactura >= startOfToday) {
                ventasHoyNormalizado += totalNormalizado;
                facturasHoyCount++;
            }
        }

        // --- 6. QUERIES ADICIONALES (Ranking, Categorías, Horarios) ---

        // --- 6a. Ranking de Productos ---
        const rankingQuery = Pedido.aggregate([
            { $match: { restaurante_id: restId, estado: 'Pagado', fecha: { $gte: startOfMonth } } }, // Filtramos por mes
            { $unwind: "$productos" },
            { $group: {
                _id: "$productos.nombre",
                totalUnidades: { $sum: "$productos.cantidad" }
            }},
            { $sort: { totalUnidades: -1 } },
            { $limit: 5 }
        ]);

        // --- 6b. Ventas por Categoría (CORREGIDO CON NORMALIZACIÓN DINÁMICA) ---
        
        // Construir la lógica de conversión basada en la monedaObjetivo
        let conversionCond = {};
        if (monedaObjetivo === 'NIO') {
            // Objetivo es NIO. Convertir USD -> NIO
            conversionCond = {
                $cond: {
                    if: { $eq: ["$facturaInfo.moneda_base_historica", "USD"] },
                    // Multiplicar por tasa histórica
                    then: { $multiply: ["$totalProducto", "$facturaInfo.tasa_cambio_historica"] }, 
                    else: "$totalProducto" // Ya es NIO
                }
            };
        } else { // monedaObjetivo === 'USD'
            // Objetivo es USD. Convertir NIO -> USD
            conversionCond = {
                $cond: {
                    if: { $eq: ["$facturaInfo.moneda_base_historica", "NIO"] },
                    // Dividir por tasa histórica
                    then: { 
                        $cond: [ 
                            { $gt: ["$facturaInfo.tasa_cambio_historica", 0] }, 
                            { $divide: ["$totalProducto", "$facturaInfo.tasa_cambio_historica"] }, 
                            0 
                        ] 
                    },
                    else: "$totalProducto" // Ya es USD
                }
            };
        }

        const categoriasQuery = Pedido.aggregate([
            { $match: { restaurante_id: restId, estado: 'Pagado', fecha: { $gte: startOfMonth } } },
            { $unwind: "$productos" },
            { $lookup: {
                from: 'facturas',
                localField: '_id',
                foreignField: 'pedido_id',
                as: 'facturaInfo'
            }},
            { $unwind: { path: "$facturaInfo", preserveNullAndEmptyArrays: true } }, 
            { $addFields: { pidObj: { $toObjectId: "$productos.productoId" } } },
            { $lookup: {
                from: 'productos', 
                localField: 'pidObj',
                foreignField: '_id',
                as: 'productoInfo'
            }},
            { $unwind: { path: "$productoInfo", preserveNullAndEmptyArrays: true } },
            { $addFields: {
                // Total del producto (sin normalizar)
                totalProducto: { $multiply: ["$productos.precio", "$productos.cantidad"] }
            }},
            { $addFields: {
                // Total del producto (Normalizado a la monedaObjetivo)
                totalProductoNormalizado: conversionCond // <-- Aplicamos la lógica dinámica
            }},
            { $group: {
                _id: { $ifNull: ["$productoInfo.categoria", "Sin Categoría"] }, 
                totalVentas: { $sum: "$totalProductoNormalizado" } // <-- Sumamos el normalizado
            }},
            { $sort: { totalVentas: -1 } },
            { $limit: 5 }
        ]);

        // --- 6c. Horarios Pico (Basado en facturas de HOY) ---
        const horariosPicoQuery = Factura.aggregate([
            { $match: { restaurante_id: restId, fecha: { $gte: startOfToday.toISOString(), $lte: hoyFin.toISOString() } } },
            { $addFields: { fechaISO: { $toDate: "$fecha" } } },
            { $project: { hora: { $hour: "$fechaISO" } } },
            { $group: {
                _id: "$hora",
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: 3 }
        ]);

        // Ejecutamos las consultas restantes
        const [rankingRes, categoriasRes, horariosRes] = await Promise.all([
            rankingQuery,
            categoriasQuery,
            horariosPicoQuery
        ]);

        // --- 7. ENSAMBLAR RESPUESTA (YA ESTÁ TODO NORMALIZADO) ---
        
        const ticketPromedioNormalizado = facturasMesCount > 0 ? (ventasMesNormalizado / facturasMesCount) : 0;
        
        const data = {
            ventas: {
                hoy: ventasHoyNormalizado,
                semana: ventasSemanaNormalizado,
                mes: ventasMesNormalizado,
                ticketPromedio: ticketPromedioNormalizado
            },
            rankingProductos: rankingRes,
            // categoriasRes ya tiene el campo 'totalVentas' normalizado
            ventasCategoria: categoriasRes, 
            horariosPico: horariosRes
        };

        res.json(data);

    } catch (err: any) {
        console.error("Error en reporte dashboard:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;