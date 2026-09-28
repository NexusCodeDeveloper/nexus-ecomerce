import { z } from 'zod';

export const schemaActualizarEstado = z.object({
  estado: z.enum(['trial', 'activa', 'pausada']),
});

export const schemaRegistrarPago = z.object({
  monto: z.number().positive('El monto debe ser mayor a cero'),
  metodo: z.enum(['transferencia', 'mercadopago', 'efectivo', 'otro']).default('transferencia'),
  dias: z.number().int().min(1, 'Mínimo 1 día').max(365, 'Máximo 365 días').default(30),
  nota: z.string().trim().max(300, 'Máximo 300 caracteres').optional().default(''),
});
