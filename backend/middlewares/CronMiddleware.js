export const requiereCron = (req, res, next) => {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return res.status(503).json({
      message: 'El cron no está configurado en el servidor',
      codigo: 'CRON_NO_CONFIGURADO',
    });
  }

  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${secreto}`) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  next();
};
