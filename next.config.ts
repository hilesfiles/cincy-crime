import type { NextConfig } from "next";

const isGitHubPages = process.env.PAGES_BUILD === "true";
const repositoryBasePath = isGitHubPages ? "/cincy-crime" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: repositoryBasePath,
  assetPrefix: repositoryBasePath || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
