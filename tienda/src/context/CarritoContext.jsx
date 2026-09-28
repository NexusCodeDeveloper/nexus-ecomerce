import { useCallback, useEffect, useMemo, useState } from 'react';
import { CarritoContext } from './carritoContexto';
import { claveItem, totalCarrito, cantidadCarrito } from '../utils/catalogo';

const claveStorage = (slug) => `carrito:${slug}`;

export const CarritoProvider = ({ slug, children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(claveStorage(slug)) || '[]');
      setItems(Array.isArray(guardado) ? guardado : []);
    } catch {
      setItems([]);
    }
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(claveStorage(slug), JSON.stringify(items));
    } catch {
      // almacenamiento no disponible
    }
  }, [slug, items]);

  const agregar = useCallback((producto, { talle = '', color = '', cantidad = 1 } = {}) => {
    const clave = claveItem(producto._id, talle, color);
    setItems((actuales) => {
      const existente = actuales.find((item) => item.clave === clave);
      if (existente) {
        return actuales.map((item) =>
          item.clave === clave ? { ...item, cantidad: item.cantidad + cantidad } : item
        );
      }
      return [
        ...actuales,
        {
          clave,
          productoId: producto._id,
          nombre: producto.nombre,
          precio: producto.precio,
          talle,
          color,
          cantidad,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((clave, cantidad) => {
    setItems((actuales) =>
      actuales.map((item) => (item.clave === clave ? { ...item, cantidad: Math.max(1, cantidad) } : item))
    );
  }, []);

  const quitar = useCallback((clave) => {
    setItems((actuales) => actuales.filter((item) => item.clave !== clave));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      total: totalCarrito(items),
      cantidad: cantidadCarrito(items),
    }),
    [items, agregar, cambiarCantidad, quitar, vaciar]
  );

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
};
