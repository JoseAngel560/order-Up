import { Router, Request } from 'express';
import Factura from '../models/Factura';
import Restaurante from '../models/Restaurante';
import mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

// --- RUTA DE RESUMEN (CORREGIDA con Agregación) ---
router.get('/resumen/hoy', async (req: Request, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id || typeof restaurante_id !== 'string') {
      return res.status(400).json({ error: 'El restaurante_id (string) es requerido' });
    }

    const restauranteObjectId = new mongoose.Types.ObjectId(restaurante_id);

    // 1. Obtener la configuración de moneda ACTUAL del restaurante
    const restaurante = await Restaurante.findById(restaurante_id, 'configuracion');
    if (!restaurante) {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    const monedaBaseActual = restaurante.configuracion.moneda; // 'NIO' o 'USD'
    const tasaCambioActual = restaurante.configuracion.tasa_cambio; // Tasa actual C$ -> USD

    const hoy = new Date();
    const inicioDia = startOfDay(hoy);
    const finDia = endOfDay(hoy);

    // 2. Usar Aggregation Pipeline para normalizar y sumar
    const resumen = await Factura.aggregate([
      {
        // Filtrar facturas del restaurante y del día
        $match: {
          restaurante_id: restauranteObjectId,
          fecha: {
            $gte: inicioDia.toISOString(),
            $lte: finDia.toISOString(),
          }
        }
      },
      {
        // 3. Normalizar el 'Total' a la MONEDA BASE ACTUAL del restaurante
        $project: {
          TotalNormalizado: {
            $cond: {
              if: { $eq: ["$moneda_base_historica", monedaBaseActual] },
              // Si la moneda histórica = moneda actual, usa el total tal cual
              then: "$Total", 
              // Si no, hay que convertir
              else: {
                $cond: {
                  // Si la histórica fue NIO y la actual es USD
                  if: { $eq: ["$moneda_base_historica", "NIO"] }, 
                  // Convierte NIO a USD (Total / tasa histórica)
                  then: { $divide: ["$Total", "$tasa_cambio_historica"] }, 
                  // Si no (la histórica fue USD y la actual es NIO)
                  // Convierte USD a NIO (Total * tasa histórica)
                  else: { $multiply: ["$Total", "$tasa_cambio_historica"] } 
                }
              }
            }
          }
        }
      },
      {
        // 4. Agrupar y sumar los totales YA NORMALIZADOS
        $group: {
          _id: null,
          ventasTotales: { $sum: "$TotalNormalizado" },
          ordenesCompletadas: { $sum: 1 }
        }
      },
      {
        // 5. Calcular ticket promedio
        $project: {
          _id: 0,
          ventasTotales: 1,
          ordenesCompletadas: 1,
          ticketPromedio: {
            $cond: [
              { $eq: ["$ordenesCompletadas", 0] },
              0,
              { $divide: ["$ventasTotales", "$ordenesCompletadas"] }
            ]
          }
        }
      }
    ]);

    if (resumen.length > 0) {
        // Devuelve los totales en la moneda base ACTUAL del restaurante
      res.json(resumen[0]);
    } else {
      // Si no hay facturas hoy
      res.json({
        ventasTotales: 0,
        ordenesCompletadas: 0,
        ticketPromedio: 0,
      });
    }
  } catch (err: any) {
    console.error("Error en GET /facturas/resumen/hoy:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Listar todos (Protegido) ---
router.get('/', async (req, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id) {
      return res.status(400).json({ error: 'El restaurante_id es requerido' });
    }

    const list = await Factura.find({ restaurante_id: restaurante_id })
      .populate('pedido_id mesero_id cajero_id') 
      .sort({ fecha: -1 });
      
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Obtener uno (Protegido) ---
router.get('/:id', async (req, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id) {
      return res.status(400).json({ error: 'El restaurante_id es requerido' });
    }

    const doc = await Factura.findOne({ 
      _id: req.params.id, 
      restaurante_id: restaurante_id 
    }).populate('pedido_id mesero_id cajero_id'); 
    
    if (!doc) return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

// --- Ruta Crear (Protegida) ---
// (Tu código de 'POST /' ya estaba correcto y bien hecho)
router.post('/', async (req: Request, res) => {
  try {
    const { 
      pedido_id, metodo_pago, subtotal, propina, 
      propina_percentage, Total, fecha, restaurante_id,
      cliente_nombre, 
      cajero_id, 
      mesero_id,
      monto_recibido,
      cambio
    } = req.body;
    
    if (!pedido_id || !metodo_pago || Total === undefined || !restaurante_id || !cajero_id || monto_recibido === undefined) {
      return res.status(400).json({ error: 'Faltan campos requeridos para facturar (incluyendo cajero y montos).' });
    }
    
    const restaurante = await Restaurante.findById(restaurante_id);
    if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const maxResult = await Factura.aggregate([
      { $match: { restaurante_id: new mongoose.Types.ObjectId(restaurante_id) } }, 
      { $group: { _id: null, maxNum: { $max: { $toInt: "$numero_factura" } } } }
    ]);
    const lastNum = maxResult.length > 0 ? maxResult[0].maxNum : 0;
    const newNumFactura = (lastNum + 1).toString().padStart(4, '0');
    
    const doc = new Factura({ 
      numero_factura: newNumFactura,
      pedido_id, metodo_pago, subtotal, propina, 
      propina_percentage, Total, fecha, restaurante_id,
      cliente_nombre,
      cajero_id,
      mesero_id,
      monto_recibido,
      cambio,
      moneda_base_historica: restaurante.configuracion.moneda,
      tasa_cambio_historica: restaurante.configuracion.tasa_cambio
    });
    
    const saved = await doc.save();
    const populated = await Factura.findById(saved._id)
      .populate('pedido_id')
      .populate('cajero_id', 'nombreusuario')
      .populate('mesero_id', 'nombrecompleto');

    res.status(201).json(populated);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Error de duplicado. ¿Ya existe una factura para este pedido?' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- Actualizar (Protegido) ---
router.put('/:id', async (req, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id) {
      return res.status(400).json({ error: 'El restaurante_id es requerido' });
    }

    delete req.body.restaurante_id; 

    const updated = await Factura.findOneAndUpdate(
      { _id: req.params.id, restaurante_id: restaurante_id },
      req.body,
      { new: true, runValidators: true }
    ).populate('pedido_id mesero_id cajero_id');
    
    if (!updated) return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Eliminar (Protegido) ---
router.delete('/:id', async (req, res) => {
  try {
    const { restaurante_id } = req.query;
    if (!restaurante_id) {
      return res.status(400).json({ error: 'El restaurante_id es requerido' });
    }

    const deleted = await Factura.findOneAndDelete({ 
      _id: req.params.id, 
      restaurante_id: restaurante_id 
    });
    
    if (!deleted) return res.status(404).json({ error: 'Factura no encontrada o no pertenece a este restaurante' });
    res.json({ message: 'Factura eliminada' });
  } catch (err: any) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

export default router;