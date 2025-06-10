import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    '8000-firebase-studio-1749115141249.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
    '6000-firebase-studio-1749115141249.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev'
  ],
};

export default nextConfig;
