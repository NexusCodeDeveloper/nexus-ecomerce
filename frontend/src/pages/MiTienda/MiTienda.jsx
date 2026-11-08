import { useEffect, useState } from 'react';
import { obtenerMiTienda, actualizarMiTienda } from '../../api/tienda';
import { urlCatalogo } from '../../utils/apiBase';
import { useApi } from '../../hooks/useApi';
import { useAutenticacion } from '../../context/autenticacionContexto';
import { useIosAlert } from '../../components/alerts';
import { obtenerMensajeErrorApi } from '../../utils/apiError';
import { COLORES_PREDEFINIDOS, FUENTES_DISPONIBLES, REDES_DISPONIBLES, estiloTema } from '../../utils/tema';
import { IosField, IosInput, IosSelect } from '../../components/ui/IosForm';
import IosButton from '../../components/ui/IosButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SubirImagen from '../../components/SubirImagen/SubirImagen';

const TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'diseno', label: 'Diseño' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'imagenes', label: 'Imágenes' },
];

const TEMA_VACIO = {
  colorPrimario: '#0A84FF',
  colorSecundario: '#FF9F0A',
  tipografia: 'Inter',
  logo: '',
  banner: '',
  redes: { instagram: '', facebook: '', tiktok: '' },
};

const FORM_VACIO = {
  nombre: '',
  whatsapp: '',
  telefono: '',
  modoVenta: 'ambos',
  pago: { alias: '', cbu: '', titular: '', banco: '' },
  tema: TEMA_VACIO,
};

const MiTienda = () => {
  const { esAdmin } = useAutenticacion();
  const { toast } = useIosAlert();
  const [tabActiva, setTabActiva] = useState('datos');
  const [form, setForm] = useState(FORM_VACIO);
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const { data, loading, error: errorCarga } = useApi(
    async () => {
      const res = await obtenerMiTienda();
      return res.data;
    },
    { mensajeError: 'No se pudo cargar la información de la tienda' }
  );

  useEffect(() => {
    if (!data) return;
    const tema = data.tema || {};
    setSlug(data.slug || '');
    setEmail(data.email || '');
    setForm({
      nombre: data.nombre || '',
      whatsapp: data.whatsapp || '',
      telefono: data.telefono || '',
      modoVenta: data.modoVenta || 'ambos',
      pago: { ...FORM_VACIO.pago, ...(data.pago || {}) },
      tema: {
        ...TEMA_VACIO,
        ...tema,
        redes: { ...TEMA_VACIO.redes, ...(tema.redes || {}) },
      },
    });
    setLogoPreview(tema.logo || '');
    setBannerPreview(tema.banner || '');
  }, [data]);

  const actualizarCampo = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarPago = (campo, valor) => {
    setForm((actual) => ({ ...actual, pago: { ...actual.pago, [campo]: valor } }));
  };

  const actualizarTema = (campo, valor) => {
    setForm((actual) => ({ ...actual, tema: { ...actual.tema, [campo]: valor } }));
  };

  const actualizarRed = (campo, valor) => {
    setForm((actual) => ({
      ...actual,
      tema: { ...actual.tema, redes: { ...actual.tema.redes, [campo]: valor } },
    }));
  };

  const guardar = async () => {
    if (guardando) return;
    setError('');
    setExito('');
    setGuardando(true);
    try {
      await actualizarMiTienda({
        nombre: form.nombre.trim(),
        whatsapp: form.whatsapp.trim(),
        telefono: form.telefono.trim(),
        modoVenta: form.modoVenta,
        pago: form.pago,
        tema: { ...form.tema, logo: logoPreview, banner: bannerPreview },
      });
      setExito('Cambios guardados');
      toast({ message: 'Cambios guardados', type: 'success' });
    } catch (err) {
      const mensaje = obtenerMensajeErrorApi(err, 'No se pudieron guardar los cambios');
      setError(mensaje);
      toast({ message: mensaje, type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="h-10 w-10" />
      </div>
    );
  }

  if (errorCarga) {
    return <p className="text-sm text-ios-red">{errorCarga}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ios-label">Mi Tienda</h1>
          <p className="text-sm text-ios-secondary">Personalizá tu catálogo online y tus datos de contacto.</p>
        </div>
        {slug && (
          <a
            href={urlCatalogo(slug)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ios-separator/50 px-4 py-2 text-sm font-semibold text-ios-secondary transition hover:bg-ios-hover"
          >
            Ver catálogo /{slug}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTabActiva(tab.id)}
            className={`rounded-ios-pill px-3.5 py-2 text-sm font-medium transition ${
              tabActiva === tab.id
                ? 'bg-ios-tint text-white'
                : 'border border-ios-separator/40 bg-ios-surface text-ios-secondary hover:bg-ios-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-ios-red">{error}</p>}
      {exito && <p className="text-sm text-emerald-600">{exito}</p>}

      <div className="rounded-3xl border border-ios-separator/40 bg-ios-surface p-4 md:p-6">
        {tabActiva === 'datos' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IosField label="Nombre del comercio" required>
              <IosInput
                value={form.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                placeholder="Tu comercio"
              />
            </IosField>
            <IosField label="WhatsApp" required hint="Se usa para coordinar envíos y consultas.">
              <IosInput
                value={form.whatsapp}
                onChange={(e) => actualizarCampo('whatsapp', e.target.value)}
                placeholder="Ej: 5491123456789"
              />
            </IosField>
            <IosField label="Teléfono">
              <IosInput
                value={form.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value)}
                placeholder="Opcional"
              />
            </IosField>
            <IosField label="Modo de venta">
              <IosSelect
                value={form.modoVenta}
                onChange={(e) => actualizarCampo('modoVenta', e.target.value)}
              >
                <option value="ambos">Local y catálogo</option>
                <option value="local">Solo local</option>
                <option value="catalogo">Solo catálogo</option>
              </IosSelect>
            </IosField>
            <IosField label="Email de la cuenta" hint="Para cambiar el email escribinos por soporte.">
              <IosInput value={email} readOnly className="opacity-70" />
            </IosField>
            <IosField label="Nombre de la tienda (link)" hint="El link del catálogo no se puede modificar desde acá.">
              <IosInput value={slug ? `/${slug}` : ''} readOnly className="opacity-70" />
            </IosField>
          </div>
        )}

        {tabActiva === 'diseno' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <IosField label="Color primario">
                <div className="flex flex-wrap items-center gap-2">
                  {COLORES_PREDEFINIDOS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => actualizarTema('colorPrimario', color)}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        form.tema.colorPrimario?.toLowerCase() === color.toLowerCase()
                          ? 'border-ios-label scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.tema.colorPrimario}
                    onChange={(e) => actualizarTema('colorPrimario', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-ios-separator/40 bg-transparent"
                    aria-label="Elegir color primario"
                  />
                </div>
              </IosField>

              <IosField label="Color secundario">
                <div className="flex flex-wrap items-center gap-2">
                  {COLORES_PREDEFINIDOS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => actualizarTema('colorSecundario', color)}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        form.tema.colorSecundario?.toLowerCase() === color.toLowerCase()
                          ? 'border-ios-label scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.tema.colorSecundario}
                    onChange={(e) => actualizarTema('colorSecundario', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-ios-separator/40 bg-transparent"
                    aria-label="Elegir color secundario"
                  />
                </div>
              </IosField>

              <IosField label="Tipografía">
                <IosSelect
                  value={form.tema.tipografia}
                  onChange={(e) => actualizarTema('tipografia', e.target.value)}
                >
                  {FUENTES_DISPONIBLES.map((fuente) => (
                    <option key={fuente.valor} value={fuente.valor}>{fuente.etiqueta}</option>
                  ))}
                </IosSelect>
              </IosField>

              <div className="space-y-3">
                <p className="text-[13px] font-medium text-ios-secondary">Redes sociales</p>
                {REDES_DISPONIBLES.map((red) => (
                  <IosField key={red.clave} label={red.etiqueta}>
                    <IosInput
                      value={form.tema.redes[red.clave]}
                      onChange={(e) => actualizarRed(red.clave, e.target.value)}
                      placeholder={red.placeholder}
                    />
                  </IosField>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ios-secondary">Vista previa</p>
              <div className="overflow-hidden rounded-2xl border border-ios-separator/40" style={estiloTema(form.tema)}>
                <div className="flex h-24 items-center justify-center text-white" style={{ backgroundColor: 'rgb(var(--tienda-primario))' }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-full border-2 border-white/60 object-cover" />
                  ) : (
                    <span className="text-2xl font-bold">{form.nombre?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="space-y-2 bg-white p-4">
                  <p className="text-base font-bold text-slate-900">{form.nombre || 'Tu comercio'}</p>
                  <p className="text-xs text-slate-400">Catálogo online</p>
                  <div className="flex gap-2 pt-1">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: 'rgb(var(--tienda-primario))' }}>
                      Comprar
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: 'rgb(var(--tienda-secundario))' }}>
                      Ver más
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'pagos' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IosField label="Alias">
              <IosInput
                value={form.pago.alias}
                onChange={(e) => actualizarPago('alias', e.target.value)}
                placeholder="Ej: mi.tienda.mp"
              />
            </IosField>
            <IosField label="CBU / CVU">
              <IosInput
                value={form.pago.cbu}
                onChange={(e) => actualizarPago('cbu', e.target.value)}
                placeholder="Número de cuenta"
              />
            </IosField>
            <IosField label="Titular">
              <IosInput
                value={form.pago.titular}
                onChange={(e) => actualizarPago('titular', e.target.value)}
                placeholder="Nombre del titular"
              />
            </IosField>
            <IosField label="Banco">
              <IosInput
                value={form.pago.banco}
                onChange={(e) => actualizarPago('banco', e.target.value)}
                placeholder="Banco o billetera"
              />
            </IosField>
            <p className="text-xs text-ios-tertiary sm:col-span-2">
              Estos datos se muestran al comprador al finalizar el pedido por transferencia.
            </p>
          </div>
        )}

        {tabActiva === 'imagenes' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ios-secondary">Logo</p>
              <SubirImagen
                tipo="logo"
                valor={logoPreview}
                etiqueta="Subir logo"
                onSubida={(url) => setLogoPreview(url)}
                onQuitar={() => setLogoPreview('')}
              />
              <p className="mt-2 text-xs text-ios-tertiary">Recomendado: imagen cuadrada.</p>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ios-secondary">Banner</p>
              <SubirImagen
                tipo="banner"
                valor={bannerPreview}
                etiqueta="Subir banner"
                onSubida={(url) => setBannerPreview(url)}
                onQuitar={() => setBannerPreview('')}
              />
              <p className="mt-2 text-xs text-ios-tertiary">Recomendado: imagen horizontal.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {!esAdmin && (
          <p className="mr-auto text-xs text-ios-tertiary">Solo un administrador puede guardar cambios.</p>
        )}
        <IosButton onClick={guardar} disabled={guardando || !esAdmin}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </IosButton>
      </div>
    </div>
  );
};

export default MiTienda;
