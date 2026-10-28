import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
