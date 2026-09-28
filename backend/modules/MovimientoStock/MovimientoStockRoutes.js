import { Router } from 'express';
import { obtenerMovimientosStock } from './MovimientoStockController.js';
import { proteger, admin } from '../../middlewares/AutenticacionMiddleware.js';
import { resolverTienda } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.use(proteger, resolverTienda);

router.get('/', admin, obtenerMovimientosStock);

export default router;
