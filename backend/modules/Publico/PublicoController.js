import mongoose from 'mongoose';
import Producto from '../Producto/ProductoModel.js';

const escaparRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const obtenerTiendaPublica = (req, res) => {
  const { nombre, slug, whatsapp, telefono, email, modoVenta, tema } = req.tienda;
  res.json({ nombre, slug, whatsapp, telefono, email, modoVenta, tema });
};

export const obtenerProductosPublicos = async (req, res, next) => {
  try {
    const { search, categoria } = req.query;
    const filtro = { tienda: req.tienda._id };

    const termino = String(search || '').trim();
    if (termino) {
      const safe = escaparRegex(termino);
      filtro.$or = [
        { nombre: { $regex: safe, $options: 'i' } },
        { categoria: { $regex: safe, $options: 'i' } },
      ];
    }

    const categoriaFiltro = String(categoria || '').trim();
    if (categoriaFiltro) {
      filtro.categoria = { $regex: `^${escaparRegex(categoriaFiltro)}$`, $options: 'i' };
    }

    const limite = Math.min(Math.max(Number(req.query.limit) || 500, 1), 500);
    const productos = await Producto.find(filtro)
      .select('nombre precio categoria colores variantes cantidad deposito')
      .sort({ nombre: 1 })
      .limit(limite);

    res.json(productos);
  } catch (error) {
    next(error);
  }
};

export const obtenerCategoriasPublicas = async (req, res, next) => {
  try {
    const categorias = await Producto.aggregate([
      {
        $match: {
          tienda: new mongoose.Types.ObjectId(String(req.tienda._id)),
          categoria: { $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$categoria' } } },
          nombre: { $min: { $trim: { input: '$categoria' } } },
          cantidad: { $sum: 1 },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, nombre: 1, cantidad: 1 } },
    ]);

    res.json(categorias);
  } catch (error) {
    next(error);
  }
};
