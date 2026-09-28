import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { consultarSlug, registrarTienda } from '../api/registro';
import { PANEL_URL } from '../utils/apiBase';
import { normalizarSlug, esSlugValido } from '../utils/registro';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const formularioVacio = {
  nombreComercio: '',
  slug: '',
  whatsapp: '',
  telefono: '',
  email: '',
  clave: '',
  aceptaTerminos: false,
};

const Registro = () => {
  const [form, setForm] = useState(formularioVacio);
  const [slugTocado, setSlugTocado] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) return undefined;

    const render = () => {
      if (!window.turnstile || !widgetRef.current) return;
      window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => setCaptchaToken(token),
      });
    };

    if (window.turnstile) {
      render();
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
    return undefined;
  }, []);

  useEffect(() => {
    if (!esSlugValido(form.slug)) {
      setDisponibilidad(null);
      return undefined;
    }

    setVerificando(true);
    const timer = setTimeout(async () => {
      try {
        const res = await consultarSlug(form.slug);
        setDisponibilidad(Boolean(res.data.disponible));
      } catch {
        setDisponibilidad(null);
      } finally {
        setVerificando(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      setVerificando(false);
    };
  }, [form.slug]);

  const cambiarNombre = (valor) => {
    setForm((actual) => ({
      ...actual,
      nombreComercio: valor,
      slug: slugTocado ? actual.slug : normalizarSlug(valor),
    }));
  };

  const enviar = async (event) => {
    event.preventDefault();
    setError('');

    if (!esSlugValido(form.slug)) {
      setError('Elegí un nombre de tienda válido (mínimo 3 letras, sin espacios)');
      return;
    }
    if (disponibilidad === false) {
      setError('Ese nombre de tienda ya está en uso');
      return;
    }
    if (!form.aceptaTerminos) {
      setError('Tenés que aceptar los términos y condiciones');
      return;
    }

    setEnviando(true);
    try {
      const res = await registrarTienda({
        nombreComercio: form.nombreComercio.trim(),
        slug: form.slug,
        whatsapp: form.whatsapp.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        clave: form.clave,
        pais: 'AR',
        aceptaTerminos: true,
        captchaToken,
      });
      setCreada(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos crear tu tienda. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (creada) {
    const slug = creada.tienda?.slug;
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">¡Tu tienda está creada!</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tenés <span className="font-semibold">7 días de prueba gratis</span>. Ya podés cargar tus
            productos desde el panel.
          </p>
          <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            Tu catálogo: <Link to={`/${slug}`} className="font-semibold text-slate-900">/{slug}</Link>
          </p>
          <a
            href={PANEL_URL}
            className="mt-5 block w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white"
          >
            Ir al panel de administración
          </a>
          <Link
            to={`/${slug}`}
            className="mt-3 block w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600"
          >
            Ver mi catálogo
          </Link>
        </div>
      </div>
    );
  }

  const indicadorSlug = () => {
    if (!form.slug) return null;
    if (!esSlugValido(form.slug)) return <span className="text-red-500">Nombre inválido</span>;
    if (verificando) return <span className="text-slate-400">Verificando…</span>;
    if (disponibilidad === true) return <span className="text-emerald-600">✓ Disponible</span>;
    if (disponibilidad === false) return <span className="text-red-500">✗ Ya está en uso</span>;
    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <form
        onSubmit={enviar}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-slate-900">Creá tu tienda online</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cargá tus productos y compartí tu catálogo. 7 días gratis, sin tarjeta.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500 sm:col-span-2">
            Nombre del comercio *
            <input
              type="text"
              value={form.nombreComercio}
              onChange={(event) => cambiarNombre(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="text-xs text-slate-500 sm:col-span-2">
            Nombre de tu tienda (link del catálogo) *
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate-400">/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => {
                  setSlugTocado(true);
                  setForm({ ...form, slug: normalizarSlug(event.target.value) });
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <span className="mt-1 block text-xs">{indicadorSlug()}</span>
          </label>

          <label className="text-xs text-slate-500">
            WhatsApp *
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
              placeholder="5491122334455"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="text-xs text-slate-500">
            Teléfono
            <input
              type="tel"
              value={form.telefono}
              onChange={(event) => setForm({ ...form, telefono: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="text-xs text-slate-500">
            Email *
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="text-xs text-slate-500">
            Contraseña *
            <input
              type="password"
              value={form.clave}
              onChange={(event) => setForm({ ...form, clave: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="text-xs text-slate-500 sm:col-span-2">
            País
            <input
              type="text"
              value="Argentina"
              disabled
              className="mt-1 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400"
            />
          </label>
        </div>

        {SITE_KEY && <div ref={widgetRef} className="mt-4" />}

        <label className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={form.aceptaTerminos}
            onChange={(event) => setForm({ ...form, aceptaTerminos: event.target.checked })}
            className="mt-0.5"
          />
          Acepto los términos y condiciones del servicio
        </label>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-4 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? 'Creando tu tienda…' : 'Crear mi tienda'}
        </button>

        <p className="mt-3 text-center text-xs text-slate-400">
          ¿Ya tenés cuenta?{' '}
          <a href={PANEL_URL} className="font-semibold text-slate-600">
            Ingresá al panel
          </a>
        </p>
      </form>
    </div>
  );
};

export default Registro;
