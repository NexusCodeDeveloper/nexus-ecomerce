import crypto from 'node:crypto';

export const cloudinaryConfigurado = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const firmaDeSubida = ({ carpeta, timestamp }) => {
  const params = `folder=${carpeta}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  return crypto.createHash('sha1').update(params).digest('hex');
};

export const generarFirmaSubida = (slug) => {
  if (!cloudinaryConfigurado()) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const carpeta = `nexus/${slug}`;
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder: carpeta,
    signature: firmaDeSubida({ carpeta, timestamp }),
  };
};
