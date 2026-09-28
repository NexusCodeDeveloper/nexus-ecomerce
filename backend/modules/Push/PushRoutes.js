import { Router } from 'express';
import { suscribir, desuscribir } from './PushController.js';
import { proteger } from '../../middlewares/AutenticacionMiddleware.js';
import { resolverTienda } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.use(proteger, resolverTienda);

router.post('/suscribir', suscribir);
router.delete('/suscribir', desuscribir);

export default router;