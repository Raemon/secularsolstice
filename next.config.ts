import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling pdfjs-dist on the server
  serverExternalPackages: ['pdfjs-dist', 'canvas', 'tone', '@tonejs/midi'],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Tell webpack to ignore these modules on the server
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/legacy/build/pdf.worker.mjs': false,
        'pdfjs-dist/build/pdf.worker.mjs': false,
        'tone': false,
        '@tonejs/midi': false,
      };
    }
    return config;
  },
};

export default nextConfig;
