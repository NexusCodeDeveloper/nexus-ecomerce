import { Router } from 'express';
import {
  obtenerTiendaPublica,
  obtenerProductosPublicos,
  obtenerCategoriasPublicas,
  crearPedidoPublico,
} from './PublicoController.js';
import { resolverTiendaPublica, requiereCatalogo } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.get('/:slug', resolverTiendaPublica, requiereCatalogo, obtenerTiendaPublica);
router.get('/:slug/productos', resolverTiendaPublica, requiereCatalogo, obtenerProductosPublicos);
router.get('/:slug/categorias', resolverTiendaPublica, requiereCatalogo, obtenerCategoriasPublicas);
router.post('/:slug/pedidos', resolverTiendaPublica, requiereCatalogo, crearPedidoPublico);

export default router;
