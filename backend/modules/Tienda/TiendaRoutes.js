import { Router } from 'express';
import { registrarTienda, consultarSlug } from './TiendaController.js';

const router = Router();

router.get('/disponibilidad/:slug', consultarSlug);
router.post('/registro', registrarTienda);

export default router;
