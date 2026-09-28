import { Router } from 'express';
import { registrarTienda, consultarSlug, ejecutarPausaVencidas } from './TiendaController.js';
import { requiereCron } from '../../middlewares/CronMiddleware.js';

const router = Router();

router.get('/disponibilidad/:slug', consultarSlug);
router.post('/registro', registrarTienda);
router.post('/cron/vencimientos', requiereCron, ejecutarPausaVencidas);

export default router;
