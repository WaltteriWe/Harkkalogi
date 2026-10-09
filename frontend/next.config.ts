import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/logIn",
        destination: "/login",
      },
    ];
  },
};

export default nextConfig;
