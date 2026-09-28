import Tienda from '../Tienda/TiendaModel.js';
import Pago from './PagoModel.js';
import { limiteTiendas } from '../Tienda/TiendaController.js';

const escaparRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const obtenerResumen = async (req, res, next) => {
  try {
    const ahora = new Date();
    const enSieteDias = new Date(ahora.getTime() + 7 * 86400000);
    const [total, trial, activas, pausadas, porVencer] = await Promise.all([
      Tienda.countDocuments(),
      Tienda.countDocuments({ estado: 'trial' }),
      Tienda.countDocuments({ estado: 'activa' }),
      Tienda.countDocuments({ estado: 'pausada' }),
      Tienda.countDocuments({
        estado: { $ne: 'pausada' },
        fechaVencimiento: { $gte: ahora, $lte: enSieteDias },
      }),
    ]);

    res.json({ total, trial, activas, pausadas, porVencer, cupo: limiteTiendas() });
  } catch (error) {
    next(error);
  }
};

export const obtenerTiendas = async (req, res, next) => {
  try {
    const { estado, buscar } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;

    const termino = String(buscar || '').trim();
    if (termino) {
      const safe = escaparRegex(termino);
      filtro.$or = [
        { nombre: { $regex: safe, $options: 'i' } },
        { slug: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const tiendas = await Tienda.find(filtro).sort({ fechaCreacion: -1 }).limit(500);
    res.json(tiendas);
  } catch (error) {
    next(error);
  }
};

export const obtenerTienda = async (req, res, next) => {
  try {
    const tienda = await Tienda.findById(req.params.id).populate('dueno', 'nombre email');
    if (!tienda) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }
    const pagos = await Pago.find({ tienda: tienda._id }).sort({ fechaCreacion: -1 }).limit(50);
    res.json({ tienda, pagos });
  } catch (error) {
    next(error);
  }
};
