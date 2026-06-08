/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Desabilita telemetria que tava crashando o build
  // (bug conhecido do Next 14.2.18)
  productionBrowserSourceMaps: false,
  experimental: {
    // não enviar telemetria
  }
};

module.exports = nextConfig;
