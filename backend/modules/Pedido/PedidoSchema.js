import { z } from 'zod';
import { ESTADOS_PEDIDO } from './PedidoModel.js';

const idProducto = z.string().regex(/^[a-f\d]{24}$/i, 'Producto inválido');

export const schemaPedidoPublico = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(2, 'El nombre es requerido').max(80, 'Máximo 80 caracteres'),
    telefono: z.string().trim().min(6, 'El teléfono es requerido').max(30, 'Máximo 30 caracteres'),
    email: z
      .union([z.string().trim().toLowerCase().email('Email inválido'), z.literal('')])
      .optional()
      .default(''),
    direccion: z.string().trim().max(200, 'Máximo 200 caracteres').optional().default(''),
    nota: z.string().trim().max(500, 'Máximo 500 caracteres').optional().default(''),
  }),
  items: z
    .array(
      z.object({
        producto: idProducto,
        cantidad: z.number().int().min(1, 'Cantidad inválida').max(999, 'Cantidad inválida'),
        talle: z.string().trim().max(50).optional().default(''),
        color: z.string().trim().max(50).optional().default(''),
      })
    )
    .min(1, 'El pedido no tiene productos')
    .max(100, 'Demasiados productos en el pedido'),
  metodoPago: z.enum(['transferencia', 'mercadopago']).default('transferencia'),
});

export const schemaEstadoPedido = z.object({
  estado: z.enum(ESTADOS_PEDIDO),
});
