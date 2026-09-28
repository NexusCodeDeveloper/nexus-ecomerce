import Tienda from '../modules/Tienda/TiendaModel.js';
import logger from '../utils/LoggerUtils.js';

export const pausarVencidas = async () => {
  const ahora = new Date();
  const resultado = await Tienda.updateMany(
    { estado: { $ne: 'pausada' }, fechaVencimiento: { $lte: ahora } },
    { $set: { estado: 'pausada' } }
  );

  if (resultado.modifiedCount > 0) {
    logger.info('Tiendas pausadas por vencimiento', { cantidad: resultado.modifiedCount });
  }

  return resultado.modifiedCount;
};
