import mongoose from 'mongoose';
import Tienda, { DIAS_TRIAL } from './TiendaModel.js';
import Usuario from '../Autenticacion/UsuarioModel.js';
import { registroTiendaSchema, disponibilidadSlugSchema } from './TiendaSchema.js';
import { generarToken } from '../../utils/JwtUtils.js';
import { verificarCaptcha } from '../../services/CaptchaService.js';
import { pausarVencidas } from '../../services/VencimientosService.js';
import logger from '../../utils/LoggerUtils.js';

const MS_POR_DIA = 86400000;

export const limiteTiendas = () => Math.max(1, Number(process.env.LIMITE_TIENDAS) || 20);

export const consultarSlug = async (req, res, next) => {
  try {
    const { slug } = disponibilidadSlugSchema.parse(req.params);
    const existe = await Tienda.exists({ slug });
    res.json({ slug, disponible: !existe });
  } catch (error) {
    next(error);
  }
};

export const ejecutarPausaVencidas = async (req, res, next) => {
  try {
    const pausadas = await pausarVencidas();
    res.json({ pausadas });
  } catch (error) {
    next(error);
  }
};

export const registrarTienda = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const data = registroTiendaSchema.parse(req.body);

    const captcha = await verificarCaptcha(data.captchaToken, req.ip);
    if (!captcha.ok) {
      return res.status(400).json({ message: captcha.motivo, codigo: 'CAPTCHA_INVALIDO' });
    }

    const totalTiendas = await Tienda.countDocuments();
    if (totalTiendas >= limiteTiendas()) {
      return res.status(403).json({
        message: 'El cupo de tiendas está completo. Escribinos para sumarte a la lista de espera.',
        codigo: 'CUPO_COMPLETO',
      });
    }

    const existeSlug = await Tienda.exists({ slug: data.slug });
    if (existeSlug) {
      return res.status(409).json({ message: 'Ese nombre de tienda ya está en uso', codigo: 'SLUG_EN_USO' });
    }

    const email = data.email.trim().toLowerCase();
    const existeEmail = await Usuario.exists({ email });
    if (existeEmail) {
      return res.status(409).json({ message: 'Ya existe una cuenta con ese email', codigo: 'EMAIL_EN_USO' });
    }

    const ahora = new Date();
    const fechaVencimiento = new Date(ahora.getTime() + DIAS_TRIAL * MS_POR_DIA);

    session.startTransaction();

    const [tienda] = await Tienda.create([{
      nombre: data.nombreComercio,
      slug: data.slug,
      estado: 'trial',
      fechaInicio: ahora,
      fechaVencimiento,
      whatsapp: data.whatsapp,
      telefono: data.telefono,
      email,
      pais: data.pais,
    }], { session });

    const [admin] = await Usuario.create([{
      nombre: data.nombreComercio,
      email,
      clave: data.clave,
      rol: 'admin',
      tienda: tienda._id,
    }], { session });

    tienda.dueno = admin._id;
    await tienda.save({ session });

    await session.commitTransaction();

    logger.info('Tienda registrada en período de prueba', { slug: tienda.slug, tienda: String(tienda._id) });

    res.status(201).json({
      tienda,
      usuario: admin.toJSON(),
      token: generarToken(admin),
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'El nombre de tienda o el email ya están en uso', codigo: 'DUPLICADO' });
    }
    next(error);
  } finally {
    session.endSession();
  }
};
