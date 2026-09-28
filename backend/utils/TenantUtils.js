export const idTienda = (req) => req.tienda?._id || req.usuario?.tienda || null;

export const filtroTienda = (req, filtro = {}) => {
  const tienda = idTienda(req);
  return tienda ? { ...filtro, tienda } : filtro;
};

export const datosTienda = (req) => {
  const tienda = idTienda(req);
  return tienda ? { tienda } : {};
};
