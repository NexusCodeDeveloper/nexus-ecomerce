import bcrypt from 'bcryptjs';
import Usuario from './UsuarioModel.js';
import { iniciarSesionSchema } from './AutenticacionSchema.js';
import { generarToken } from '../../utils/JwtUtils.js';

export const iniciarSesion = async (req, res, next) => {
  try {
    const data = iniciarSesionSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const usuario = await Usuario.findOne({ email });
    if (!usuario || !(await usuario.comparePassword(data.clave))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        message: 'Tu cuenta está desactivada, contactá al administrador',
        codigo: 'CUENTA_DESACTIVADA',
      });
    }

    const token = generarToken(usuario);

    res.json({
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      tienda: usuario.tienda || null,
      activo: usuario.activo,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const cerrarSesion = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (usuario) {
      usuario.versionToken = (usuario.versionToken || 0) + 1;
      await usuario.save();
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (error) {
    next(error);
  }
};

export const obtenerPerfil = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-clave -versionToken');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario.toJSON());
  } catch (error) {
    next(error);
  }
};