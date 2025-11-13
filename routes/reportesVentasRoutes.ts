// food-backend/routes/reportesVentasRoutes.ts
import { Router } from 'express';
import mongoose from 'mongoose';
import Factura from '../models/Factura';
// Importamos Restaurante para la lógica de normalización (si la quisiéramos hacer aquí)
// Pero por ahora, solo pasaremos los datos históricos al frontend.

const router = Router();

// Define el tipo de moneda para TypeScript
type CurrencyType = 'USD' | 'NIO';

router.get('/', async (req, res) => {
    try {
        const { 
            restaurante_id, periodo, 
            fechaInicio: customInicio, fechaFin: customFin, 
            nombre_empleado, 
            numero_mesa 
        } = req.query;

        if (!restaurante_id) {
            return res.status(400).json({ error: 'El restaurante_id es requerido' });
        }

        const restId = new mongoose.Types.ObjectId(restaurante_id as string);
        let fechaStart = new Date();
        let fechaEnd = new Date();
        fechaEnd.setHours(23, 59, 59, 999);

        // --- 1. Configuración de Fechas (Sin cambios) ---
        switch (periodo) {
            case 'Hoy':
                fechaStart.setHours(0, 0, 0, 0);
                break;
            case 'Ayer':
                fechaStart.setDate(fechaStart.getDate() - 1);
                fechaStart.setHours(0, 0, 0, 0);
                fechaEnd.setDate(fechaEnd.getDate() - 1);
                fechaEnd.setHours(23, 59, 59, 999);
                break;
            case 'Esta semana':
                const day = fechaStart.getDay() || 7; 
                if (day !== 1) fechaStart.setHours(-24 * (day - 1));
                fechaStart.setHours(0, 0, 0, 0);
                break;
            case 'Este mes':
                fechaStart.setDate(1);
                fechaStart.setHours(0, 0, 0, 0);
                break;
            case 'Personalizado':
                 if (customInicio && customFin) {
                    fechaStart = new Date(customInicio as string + 'T00:00:00');
                    fechaEnd = new Date(customFin as string + 'T23:59:59.999');
                 } else {
                     fechaStart.setHours(0, 0, 0, 0);
                 }
                 break;
            default:
                fechaStart.setHours(0, 0, 0, 0);
        }

        // --- 2. Pipeline Base ---
        const pipeline: any[] = [
            {
                $match: {
                    restaurante_id: restId,
                    fecha: { $gte: fechaStart.toISOString(), $lte: fechaEnd.toISOString() }
                }
            }
        ];

        // --- 3. JOINs (Sin cambios) ---
        pipeline.push(
            { $lookup: { from: 'pedidos', localField: 'pedido_id', foreignField: '_id', as: 'pedido_info' } },
            { $unwind: { path: '$pedido_info', preserveNullAndEmptyArrays: true } }, // preserveNull si una factura no tiene pedido (raro)
            { $lookup: { from: 'empleados', localField: 'mesero_id', foreignField: '_id', as: 'mesero_info' } },
            { $unwind: { path: '$mesero_info', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'usuarios', localField: 'cajero_id', foreignField: '_id', as: 'cajero_info' } },
            { $unwind: { path: '$cajero_info', preserveNullAndEmptyArrays: true } }
        );

        // --- 4. APLICAR NUEVOS FILTROS (Sin cambios) ---
        
        if (numero_mesa) {
            pipeline.push({ 
                $match: { 'pedido_info.numero_mesa': parseInt(numero_mesa as string) } 
            });
        }

        if (nombre_empleado) {
            const regex = new RegExp(nombre_empleado as string, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'mesero_info.nombrecompleto': { $regex: regex } },
                        { 'cajero_info.nombreusuario': { $regex: regex } }
                    ]
                }
            });
        }

        // --- 5. Orden y Proyección (ACTUALIZADO) ---
        pipeline.push({ $sort: { fecha: -1 } });

        pipeline.push({
            $project: {
                _id: 1, numero_factura: 1, fecha: 1, cliente_nombre: 1, metodo_pago: 1,
                subtotal: 1, propina: 1, Total: 1, monto_recibido: 1, cambio: 1,
                
                // --- CAMPOS HISTÓRICOS AÑADIDOS (VITAL) ---
                moneda_base_historica: 1,
                tasa_cambio_historica: 1,
                // ---------------------------------------
                
                // (Este cálculo de impuesto es una aproximación, pero se mantiene tu lógica)
                impuesto: { $subtract: ["$Total", { $add: ["$subtotal", "$propina"] }] }, 
                
                mesero: '$mesero_info.nombrecompleto',
                cajero: '$cajero_info.nombreusuario',
                mesa: '$pedido_info.numero_mesa',
                productos: '$pedido_info.productos'
            }
        });

        const facturas = await Factura.aggregate(pipeline);
        
        // --- 6. DEVUELVE LA LISTA DE FACTURAS ---
        // La normalización de totales se hará en el frontend
        res.json(facturas);

    } catch (err: any) {
        console.error("Error en reporte de ventas:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;