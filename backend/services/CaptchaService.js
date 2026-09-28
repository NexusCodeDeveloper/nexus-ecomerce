import logger from '../utils/LoggerUtils.js';

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const captchaConfigurado = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export const verificarCaptcha = async (token, ip) => {
  if (!captchaConfigurado()) return { ok: true, omitido: true };
  if (!token) return { ok: false, motivo: 'Completá la verificación anti-robots' };

  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: String(token),
    });
    if (ip) body.set('remoteip', ip);

    const respuesta = await fetch(TURNSTILE_URL, { method: 'POST', body });
    const data = await respuesta.json();
    if (data.success) return { ok: true };
    return { ok: false, motivo: 'La verificación anti-robots falló, intentá de nuevo' };
  } catch (error) {
    logger.warn('No se pudo verificar el captcha', {
      motivo: error.message,
      queRevisar: 'Revisá la conexión con Cloudflare Turnstile y TURNSTILE_SECRET_KEY.',
      origen: 'backend',
      lugar: 'CaptchaService.js',
    });
    return { ok: false, motivo: 'No se pudo verificar la verificación anti-robots' };
  }
};
