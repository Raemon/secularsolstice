import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling heavy packages on the server
  serverExternalPackages: ['pdfjs-dist', 'canvas', 'tone', '@tonejs/midi', 'bcrypt', 'opensheetmusicdisplay', 'verovio'],
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {},
  async redirects() {
    return [
      { source: '/resources', destination: 'https://secularsolstice.wordpress.com/resources', permanent: true },
      { source: '/musical-arcs-and-goals', destination: 'https://secularsolstice.wordpress.com/musical-arcs-and-goals', permanent: true },
      { source: '/a-campbellian-perspective-on-solstice', destination: 'https://secularsolstice.wordpress.com/a-campbellian-perspective-on-solstice', permanent: true },
      { source: '/solstice-resource-repository', destination: 'https://secularsolstice.wordpress.com/solstice-resource-repository', permanent: true },
      { source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*', destination: 'https://secularsolstice.wordpress.com/:year/:month/:day/:slug*', permanent: true },
    ];
  },
};

export default nextConfig;
