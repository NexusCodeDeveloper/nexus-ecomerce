import { Router } from 'express';
import { obtenerPedidos, cambiarEstadoPedido } from './PedidoController.js';
import { proteger } from '../../middlewares/AutenticacionMiddleware.js';
import { resolverTienda } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.use(proteger, resolverTienda);

router.get('/', obtenerPedidos);
router.patch('/:id/estado', cambiarEstadoPedido);

export default router;
