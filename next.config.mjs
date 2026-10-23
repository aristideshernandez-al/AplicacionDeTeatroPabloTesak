/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination:
          "https://teatropablotesak-78d51.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
