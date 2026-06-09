/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export (sem servidor, sem Functions, sem dor de cabeça)
  // Marketing é landing page - não precisa de SSR
  output: 'export',
  images: {
    unoptimized: true
  },
  // Trailing slash pra Netlify servir certinho
  trailingSlash: true
};

module.exports = nextConfig;
