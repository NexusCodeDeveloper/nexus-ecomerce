import { Router } from 'express';
import {
  obtenerTiendaPublica,
  obtenerProductosPublicos,
  obtenerCategoriasPublicas,
} from './PublicoController.js';
import { resolverTiendaPublica, requiereCatalogo } from '../../middlewares/TenantMiddleware.js';

const router = Router();

router.get('/:slug', resolverTiendaPublica, requiereCatalogo, obtenerTiendaPublica);
router.get('/:slug/productos', resolverTiendaPublica, requiereCatalogo, obtenerProductosPublicos);
router.get('/:slug/categorias', resolverTiendaPublica, requiereCatalogo, obtenerCategoriasPublicas);

export default router;
