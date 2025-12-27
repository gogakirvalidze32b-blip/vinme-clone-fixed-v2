/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.100.2",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
