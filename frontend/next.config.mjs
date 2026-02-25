/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Proxy /api/* to the backend so ngrok users don't need direct backend access
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/:path*`,
            },
        ]
    },
};

export default nextConfig;
