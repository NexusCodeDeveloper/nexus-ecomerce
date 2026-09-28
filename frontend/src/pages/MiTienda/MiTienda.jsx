import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAutenticacion } from '../../context/autenticacionContexto';
import { obtenerMiTienda, actualizarMiTienda, firmarSubidaCloudinary } from '../../api/tienda';
import { useIosAlert } from '../components/alerts';
import { obtenerMensajeErrorApi } from '../../utils/apiError';
import { formatearMoneda } from '../../utils/format';
import { hexARgb } from '../../utils/catalogo';
import { SubirImagen } from '../components/SubirImagen';

const TABS = [
  { id: 'datos', label: 'Datos', icon: '📋' },
  { id: 'diseno', label: 'Diseño', icon: '🎨' },
  { id: 'pagos', label: 'Pagos', icon: '💳' },
  { id: 'imagenes', label: 'Imágenes', icon: '🖼️' },
];

const COLORES_PREDEFINIDOS = [
  '#0A84FF', '#FF9F0A', '#FF453A', '#FF9500', '#AF52DE', '#00C7BE',
  '#32D74B', '#FF2D55', '#5E5CE6', '#007AFF', '#8E8E93', '#8E8E93',
];

const FUENTES_DISPONIBLES = [
  { valor: 'Inter', etiqueta: 'Inter' },
  { valor: 'Poppins', etiqueta: 'Poppins' },
  { valor: 'Roboto', etiqueta: 'Roboto' },
  { valor: 'Montserrat', etiqueta: 'Montserrat' },
  { valor: 'Open Sans', etiqueta: 'Open Sans' },
  { valor: 'Lato', etiqueta: 'Lato' },
  { valor: 'Nunito', etiqueta: 'Nunito' },
  { valor: 'Roboto Slab', etiqueta: 'Roboto Slab' },
];

const MiTienda = () => {
  const { usuario, tienda } = useAutenticacion();
  const navigate = useNavigate();
  const { toast } = useIosAlert();
  const [tabActiva, setTabActiva] = useState('datos');
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    whatsapp: '',
    telefono: '',
    email: '',
    modoVenta: 'ambos',
    pago: { alias: '', cbu: '', titular: '', banco: '' },
    tema: {
      colorPrimario: '#0A84FF',
      colorSecundario: '#FF9F0A',
      tipografia: 'Inter',
      logo: '',
      banner: '',
      redes: { instagram: '', facebook: '', tiktok: '' },
    },
    pago: { alias: '', cbu: '', titular: '', banco: '' },
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [cargando, setCargando] = useState(true);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/tienda', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setForm({
            nombre: data.nombre || '',
            whatsapp: data.whatsapp || '',
            telefono: data.telefono || '',
            email: data.email || '',
            modoVenta: data.modoVenta || 'ambos',
            pago: data.pago || { alias: '', cbu: '', titular: '', banco: '' },
            tema: {
              colorPrimario: data.tema?.colorPrimario || '#0A84FF',
              colorSecundario: data.tema?.colorSecundario || '#FF9F0A',
              tipografia: data.tema?.tipografia || 'Inter',
              logo: data.tema?.logo || '',
              banner: data.tema?.banner || '',
              redes: data.tema?.redes || { instagram: '', facebook: '', tiktok: '' },
            },
            pago: data.pago || { alias: '', cbu: '', titular: '', banco: '' },
          });
          if (data.tema?.logo) setLogoPreview(data.tema.logo);
          if (data.tema?.banner) setBannerPreview(data.tema.banner);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const actualizarCampo = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarCampoAnidado = (padre, campo, valor) => {
    setForm((actual) => ({
      ...actual,
      [padre]: { ...actual[padre], [campo]: valor },
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((actual) => ({ ...actual, [name]: checked }));
    } else {
      setForm((actual) => ({ ...actual, [name]: value }));
    }
  };

  const handleChangeAnidado = (padre, campo, valor) => {
    setForm((actual) => ({
      ...actual,
      [padre]: { ...actual[padre], [campo]: valor },
    });
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('/api/tienda', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const data = await res.json();
      toast({ message: 'Cambios guardados', type: 'success' });
    } catch (err) {
      toast({ message: 'Error al guardar', type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const subirImagen = async (tipo) => {
    if (!window.turnstile && document.querySelector('script[src*="turnstile"]')) {
      // Turnstile ya cargado
    }
    setSubiendoImagen(true);
    try {
      // 1. Obtener firma
      const resFirma = await fetch('/api/tienda/cloudinary/firma', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Cloudinary no configurado');
      const { signature, timestamp, folder, apiKey, cloudName } = await res.json();

      // 2. Subir a Cloudinary
      const formData = new FormData();
      formData.append('file', fileRef.current.files[0]);
      formData.append('api_key', 'YOUR_API_KEY'); // Se completa desde la firma
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Error al subir');

      // Actualizar preview y formulario
      if (tipo === 'logo') {
        setLogoPreview(data.secure_url);
        setForm((a) => ({ ...a, tema: { ...a.tema, logo: data.secure_url } }));
      } else {
        setBannerPreview(data.secure_url);
        setForm((a) => ({ ...a, tema: { ...a.tema, banner: data.secure_url } }));
      }
      toast({ message: 'Imagen subida', type: 'success' });
    } catch (err) {
      toast({ message: 'Error al subir imagen', type: 'error' });
    } finally {
      setSubiendoImagen(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ios-bg">
        <LoadingSpinner size="h-10 w-10" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-ios-bg"
      style={{ '--tienda-primario': hexARgb(form.tema?.colorPrimario || '#0A84FF') }}
    >
      <header className="sticky top-0 z-20 border-b border-ios-separator/40 bg-ios-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <span className="font-semibold text-ios-label">Mi Tienda</span>
          <nav className="flex items-center gap-1 ml-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`px-3 py-1.5 rounded-ios-pill text-sm font-medium transition ${
                  tabActiva === tab.id
                    ? 'bg-ios-tint text-white'
                    : 'text-ios-secondary hover:bg-ios-hover'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-xs text-ios-tertiary">{usuario?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 animate-ios-page">
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {exito && <p className="mb-4 text-sm text-emerald-600">{exito}</p>}

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`px-3 py-1.5 rounded-ios-pill text-sm font-medium transition ${
                tabActiva === tab.id
                  ? 'bg-ios-tint text-white'
                : 'bg-ios-surface text-ios-secondary border border-ios-separator/40 hover:bg-ios-hover'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {tabActiva === 'datos' && <DatosTab form={form} onChange={handleChange} guardando={guardando} onGuardar={guardar} />}
        {tabActiva === 'diseno' && <DisenoTab form={form} onChange={handleChangeAnidado} />}
        {tabActiva === 'pagos' && <PagosTab form={form} onChange={handleChangeAnidado} />}
        {tabActiva === 'imagenes' && <ImagenesTab
          logoPreview={logoPreview}
          bannerPreview={bannerPreview}
          subiendoLogo={subiendoLogo}
          subiendoBanner={subiendoBanner}
          onSubirLogo={() => setSubiendoLogo(true)}
          onSubirBanner={() => setSubiendoBanner(true)}
          onCambiarLogo={(url) => { setLogoPreview(url); setForm(a => ({...a, tema: {...a.tema, logo: url}})); }}
          onCambiarBanner={(url) => { setBannerPreview(url); setForm(a => ({...a, tema: {...a.tema, banner: url}})); }}
        />}

        {exito && <p className="mt-4 text-center text-sm text-emerald-600">{exito}</p>}
        {error && <p className="mt-4 text-center text-red-500">{error}</p>}
      </main>
    </div>
  );
};

export default MiTienda;