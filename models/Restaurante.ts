import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurante extends Document {
  restaurante_id: number;
  nombre_restaurante: string;
  direccion: string;
  telefono: string; // <--- NUEVO CAMPO
  mesas: number;
  cargos_seleccionados: string[];
  servicios_disponibles: {
    serv_mesa: boolean;
    delivery: boolean;
  };
  configuracion: {
    propina_default: number;
    impuesto_default: number;
    moneda: string;
    tasa_cambio: number; // <--- NUEVO: 1 USD = X C$
    // notif_sonido ELIMINADO
  };
}

const RestauranteSchema: Schema = new Schema({
  restaurante_id: { type: Number, required: true, unique: true },
  nombre_restaurante: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String, required: true }, // <--- NUEVO CAMPO OBLIGATORIO
  mesas: { type: Number, required: true },
  cargos_seleccionados: [String],
  servicios_disponibles: {
    serv_mesa: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false }
  },
  configuracion: {
    propina_default: { type: Number, default: 0 },
    impuesto_default: { type: Number, default: 15 },
    moneda: { type: String, enum: ['USD', 'NIO'], default: 'NIO' }, // <--- LIMITADO A USD/NIO
    tasa_cambio: { type: Number, default: 36.5 }, // <--- NUEVO
    // notif_sonido ELIMINADO
  }
}, { timestamps: true });

export default mongoose.model<IRestaurante>('Restaurante', RestauranteSchema);