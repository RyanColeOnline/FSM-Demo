/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Typechecking is validated during pre-push tsc to avoid Cloud Build V8 OOM
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;