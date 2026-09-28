import { Router } from 'express';
import {
  obtenerResumen,
  obtenerTiendas,
  obtenerTienda,
  cambiarEstado,
  registrarPago,
} from './SuperadminController.js';
import { proteger } from '../../middlewares/AutenticacionMiddleware.js';
import { requiereSuperadmin } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.use(proteger, requiereSuperadmin);

router.get('/resumen', obtenerResumen);
router.get('/tiendas', obtenerTiendas);
router.get('/tiendas/:id', obtenerTienda);
router.patch('/tiendas/:id/estado', cambiarEstado);
router.post('/tiendas/:id/pagos', registrarPago);

export default router;
