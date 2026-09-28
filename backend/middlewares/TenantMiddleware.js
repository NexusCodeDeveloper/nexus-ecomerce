import Tienda from '../modules/Tienda/TiendaModel.js';

const responderTiendaPausada = (res) =>
  res.status(403).json({
    message: 'La tienda está pausada, contactá al administrador de la plataforma',
    codigo: 'TIENDA_PAUSADA',
  });

export const resolverTienda = async (req, res, next) => {
  try {
    if (!req.usuario?.tienda) {
      return res.status(403).json({
        message: 'El usuario no pertenece a ninguna tienda',
        codigo: 'SIN_TIENDA',
      });
    }

    const tienda = await Tienda.findById(req.usuario.tienda);
    if (!tienda) {
      return res.status(404).json({
        message: 'Tienda no encontrada',
        codigo: 'TIENDA_NO_ENCONTRADA',
      });
    }
    if (tienda.estado === 'pausada') {
      return responderTiendaPausada(res);
    }

    req.tienda = tienda;
    next();
  } catch (error) {
    next(error);
  }
};

export const resolverTiendaPublica = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ message: 'Falta el nombre de la tienda' });
    }

    const tienda = await Tienda.findOne({ slug });
    if (!tienda) {
      return res.status(404).json({
        message: 'Tienda no encontrada',
        codigo: 'TIENDA_NO_ENCONTRADA',
      });
    }
    if (!tienda.estaVigente()) {
      return responderTiendaPausada(res);
    }

    req.tienda = tienda;
    next();
  } catch (error) {
    next(error);
  }
};

export const requiereSuperadmin = (req, res, next) => {
  if (req.usuario?.rol === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Acceso denegado, se requiere rol de superadministrador' });
  }
};
