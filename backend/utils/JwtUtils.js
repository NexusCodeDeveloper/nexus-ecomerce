import jwt from 'jsonwebtoken';

export const DURACION_TOKEN = '8h';

export const generarToken = (usuario) =>
  jwt.sign(
    {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      tienda: usuario.tienda ? String(usuario.tienda) : null,
      versionToken: usuario.versionToken || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: DURACION_TOKEN }
  );
