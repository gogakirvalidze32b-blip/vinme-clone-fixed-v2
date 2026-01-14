/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },

  // build memory ↓
  productionBrowserSourceMaps: false,

  experimental: {
    // build trace ნაკლები ზომა/მეხსიერება
    outputFileTracingRoot: process.cwd(),
  },

  images: {
    // თუ არ გჭირდება next/image ოპტიმიზაცია prod-ში:
    unoptimized: true,
  },
};

export default nextConfig;