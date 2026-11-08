import { useRef, useState } from 'react';
import { useIosAlert } from '../../components/alerts';
import { firmarSubidaCloudinary } from '../../api/tienda';
import { validarImagen } from '../../utils/imagenes';

const SubirImagen = ({ tipo, valor, onSubida, onQuitar, etiqueta = 'Subir imagen' }) => {
  const { toast } = useIosAlert();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validacion = validarImagen(file);
    if (!validacion.ok) {
      setError(validacion.mensaje);
      toast({ message: validacion.mensaje, type: 'error' });
      return;
    }

    setSubiendo(true);
    setError('');

    try {
      const { data: firma } = await firmarSubidaCloudinary();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', firma.apiKey);
      formData.append('timestamp', String(firma.timestamp));
      formData.append('signature', firma.signature);
      formData.append('folder', firma.folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const subida = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(subida.error?.message || 'No se pudo subir la imagen');
      if (!subida.secure_url) throw new Error('Cloudinary no devolvió la URL de la imagen');

      onSubida?.(subida.secure_url);
      toast({ message: 'Imagen subida', type: 'success' });
    } catch (err) {
      const mensaje = err?.response?.data?.message || err?.message || 'No se pudo subir la imagen';
      setError(mensaje);
      toast({ message: mensaje, type: 'error' });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-ios-separator/50 bg-ios-surface">
        {valor ? (
          <>
            <img src={valor} alt={etiqueta} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ios-label transition hover:bg-white"
              >
                Cambiar
              </button>
              {onQuitar && (
                <button
                  type="button"
                  onClick={onQuitar}
                  className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black/70"
                >
                  Quitar
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-ios-secondary transition hover:bg-ios-hover"
          >
            <svg className="h-10 w-10 text-ios-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 13.414V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium">{etiqueta}</span>
            <span className="text-[11px] text-ios-tertiary">JPG, PNG o WebP · máx 4.5 MB</span>
          </button>
        )}

        {subiendo && (
          <div className="absolute inset-0 flex items-center justify-center bg-ios-surface/80">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-ios-tint border-t-transparent" />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id={`upload-${tipo}`}
      />

      {error && <p className="text-xs text-ios-red">{error}</p>}
    </div>
  );
};

export default SubirImagen;
