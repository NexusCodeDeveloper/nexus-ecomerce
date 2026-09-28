import { createContext, useContext } from 'react';

export const CarritoContext = createContext(null);

export const useCarrito = () => useContext(CarritoContext);
