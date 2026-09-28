import { Router } from 'express';
import { obtenerPedidosSuperadmin, cambiarEstadoPedidoSuperadmin } from './PedidoControllerSuperadmin.js';
import { proteger } from '../../middlewares/AutenticacionMiddleware.js';
import { superadmin } from '../../middlewares/AutenticacionMiddleware.js';

const router = Router();

// Solo superadmin puede acceder
router.use(require('../../middlewares/AutenticacionMiddleware.js').proteger);
router.use(require('../../middlewares/AutenticacionMiddleware.js').superadmin);

router.get('/', obtenerPedidosSuperadmin);
router.patch('/:id/estado', cambiarEstadoPedidoSuperadmin);

export default router;