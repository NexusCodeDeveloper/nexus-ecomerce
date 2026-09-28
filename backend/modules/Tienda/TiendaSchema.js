import { z } from 'zod';
import { esSlugValido } from './TiendaUtils.js';

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El nombre de la tienda debe tener al menos 3 caracteres')
  .max(40, 'El nombre de la tienda no puede superar los 40 caracteres')
  .refine(esSlugValido, 'El nombre de la tienda no es válido o está reservado');

export const crearTiendaSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del comercio es requerido'),
  slug: slugSchema,
  whatsapp: z.string().trim().min(6, 'El WhatsApp es requerido'),
  telefono: z.string().trim().optional().default(''),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  pais: z.literal('AR', { errorMap: () => ({ message: 'Por ahora solo operamos en Argentina' }) }).default('AR'),
  modoVenta: z.enum(['local', 'catalogo', 'ambos']).default('ambos'),
});

export const actualizarTiendaSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del comercio es requerido').optional(),
  whatsapp: z.string().trim().min(6, 'El WhatsApp es requerido').optional(),
  telefono: z.string().trim().optional(),
  modoVenta: z.enum(['local', 'catalogo', 'ambos']).optional(),
});

export const registroTiendaSchema = z.object({
  nombreComercio: z.string().trim().min(2, 'El nombre del comercio es requerido').max(80, 'Máximo 80 caracteres'),
  slug: slugSchema,
  whatsapp: z.string().trim().min(6, 'El WhatsApp es requerido').max(30, 'Máximo 30 caracteres'),
  telefono: z.string().trim().max(30, 'Máximo 30 caracteres').optional().default(''),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  clave: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100, 'Máximo 100 caracteres'),
  pais: z.literal('AR', { errorMap: () => ({ message: 'Por ahora solo operamos en Argentina' }) }).default('AR'),
  aceptaTerminos: z.literal(true, { errorMap: () => ({ message: 'Tenés que aceptar los términos y condiciones' }) }),
  captchaToken: z.string().trim().max(2000).optional().default(''),
});

export const disponibilidadSlugSchema = z.object({
  slug: slugSchema,
});
