import type { NextConfig } from "next";

// This project is a UI-only demo. Exporting static files keeps API keys and
// server routes out of the image, so it can be shared and run anywhere.
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;


