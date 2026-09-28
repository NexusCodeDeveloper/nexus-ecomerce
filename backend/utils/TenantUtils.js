export const idTienda = (req) => req.tienda?._id || req.usuario?.tienda || null;

export const conTienda = (tienda, filtro = {}) => (tienda ? { ...filtro, tienda } : filtro);

export const filtroTienda = (req, filtro = {}) => conTienda(idTienda(req), filtro);

export const datosTienda = (req) => {
  const tienda = idTienda(req);
  return tienda ? { tienda } : {};
};
