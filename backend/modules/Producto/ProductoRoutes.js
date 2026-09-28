import { Router } from 'express';
import {
  obtenerProductos,
  obtenerCategorias,
  obtenerProducto,
  obtenerProductoPorCodigo,
  siguienteCodigo,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerEstadisticasTablero,
  intercambiarProducto,
  agregarStock,
  agregarDeposito,
  agregarCatalogo,
  reponerStock,
  pasarAlSalon,
  pasarAlCatalogo,
  retirarStock,
  retirarDelCatalogo,
  obtenerStockBajo,
} from './ProductoController.js';
import { proteger, admin } from '../../middlewares/AutenticacionMiddleware.js';
import { resolverTienda } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.use(proteger, resolverTienda);

router.get('/stats', obtenerEstadisticasTablero);
router.get('/stock-bajo', obtenerStockBajo);
router.get('/categorias', obtenerCategorias);
router.get('/codigo/:codigo', obtenerProductoPorCodigo);
router.get('/siguiente-codigo', admin, siguienteCodigo);
router.get('/', obtenerProductos);
router.get('/:id', obtenerProducto);
router.post('/', admin, crearProducto);
router.put('/:id', admin, actualizarProducto);
router.put('/:id/agregar-stock', admin, agregarStock);
router.put('/:id/deposito', admin, agregarDeposito);
router.put('/:id/catalogo', admin, agregarCatalogo);
router.post('/pasar-salon', pasarAlSalon);
router.post('/pasar-catalogo', pasarAlCatalogo);
router.post('/:id/reponer', reponerStock);
router.post('/:id/retirar', admin, retirarStock);
router.post('/:id/retirar-catalogo', admin, retirarDelCatalogo);
router.post('/intercambio', intercambiarProducto);
router.delete('/:id', admin, eliminarProducto);

export default router;
