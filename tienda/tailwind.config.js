/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', 'Roboto', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        marca: 'rgb(var(--tienda-primario) / <alpha-value>)',
        secundario: 'rgb(var(--tienda-secundario) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
