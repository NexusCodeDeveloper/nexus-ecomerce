import { useState, useRef } from 'react';
import { useIosAlert } from '../../components/alerts';
import { obtenerMensajeErrorApi } from '../../utils/apiError';
import { firmarSubidaCloudinary } from '../../api/tienda';

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB límite Vercel

const SubirImagen = ({ tipo, onSubida, subiendo, onCancelar }) => {
  const { toast } = useIosAlert();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!TIPOS_ACEPTADOS.includes(file.type)) {
      toast({ message: 'Solo JPG, PNG o WebP', type: 'error' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ message: 'Máximo 4.5 MB', type: 'error' });
      return;
    }

    setSubiendo(true);
    setError('');

    try {
      const resFirma = await fetch('/api/tienda/cloudinary/firma', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Cloudinary no configurado');
      const { signature, timestamp, folder, apiKey, cloudName } = await res.json();

      const formData = new FormData();
      formData.append('file', file);
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

      onSubida(data.secure_url);
    } catch (err) {
      toast({ message: 'Error al subir imagen', type: 'error' });
    } finally {
      setSubiendo(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onCambio(file);
  };

  return (
    <div className="relative">
      <label className="block w-full cursor-pointer">
        <input
          type="file"
          ref={fileRef}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${tipo}`}
        />
        <label
          htmlFor={`upload-${tipo}`}
          className={`w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200/50 bg-ios-surface p-6 flex flex-col items-center justify-center cursor-pointer transition hover:border-marca/50`}
        >
          <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 13.414V5a2 2 0 012-2h6a2 2 0 012 2v15.793l2.293-2.293a2 2 0 012.828 0L22 19.414" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Arrastra o haz clic para subir</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP · máx 4.5 MB</p>
        </label>
        {subiendo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-marca border-t-transparent" /></div>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </label>
    </div>
  );
};

export default SubirImagen;