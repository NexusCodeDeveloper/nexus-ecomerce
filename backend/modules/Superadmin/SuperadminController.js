import Tienda from '../Tienda/TiendaModel.js';
import Pago from './PagoModel.js';
import { limiteTiendas } from '../Tienda/TiendaController.js';
import { schemaActualizarEstado, schemaRegistrarPago } from './SuperadminSchema.js';

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

export const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = schemaActualizarEstado.parse(req.body);
    const tienda = await Tienda.findByIdAndUpdate(req.params.id, { $set: { estado } }, { new: true });
    if (!tienda) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }
    res.json(tienda);
  } catch (error) {
    next(error);
  }
};

export const registrarPago = async (req, res, next) => {
  try {
    const data = schemaRegistrarPago.parse(req.body);
    const tienda = await Tienda.findById(req.params.id);
    if (!tienda) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    const ahora = new Date();
    const base = tienda.fechaVencimiento && tienda.fechaVencimiento > ahora ? tienda.fechaVencimiento : ahora;
    const periodoHasta = new Date(base.getTime() + data.dias * 86400000);

    const pago = await Pago.create({
      tienda: tienda._id,
      monto: data.monto,
      metodo: data.metodo,
      periodoDesde: base,
      periodoHasta,
      nota: data.nota,
      registradoPor: req.usuario.id,
    });

    tienda.estado = 'activa';
    tienda.fechaVencimiento = periodoHasta;
    await tienda.save();

    res.status(201).json({ pago, tienda });
  } catch (error) {
    next(error);
  }
};
