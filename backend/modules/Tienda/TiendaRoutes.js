import { Router } from 'express';
import {
  registrarTienda,
  consultarSlug,
  ejecutarPausaVencidas,
  obtenerMiTienda,
  actualizarMiTienda,
  firmarSubidaCloudinary,
} from './TiendaController.js';
import { requiereCron } from '../../middlewares/CronMiddleware.js';
import { proteger } from '../../middlewares/AutenticacionMiddleware.js';
import { resolverTienda } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.get('/', proteger, resolverTienda, obtenerMiTienda);
router.patch('/', proteger, resolverTienda, actualizarMiTienda);
router.post('/cloudinary/firma', proteger, resolverTienda, firmarSubidaCloudinary);
router.get('/disponibilidad/:slug', consultarSlug);
router.post('/registro', registrarTienda);
router.post('/cron/vencimientos', requiereCron, ejecutarPausaVencidas);

export default router;
