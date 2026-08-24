import type { NextConfig } from "next";

const BLOB_HOST = "https://lmqsm6ilog52dyon.public.blob.vercel-storage.com";

// React dev mode uses eval() for its debugging/error-overlay tooling — it
// never does in a production build, so unsafe-eval is scoped to dev only.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // wavesurfer.js decodes remote audio into a local blob: object URL, so
  // media-src needs both the origin the mp3s are fetched from and blob:.
  `media-src 'self' blob: ${BLOB_HOST}`,
  `connect-src 'self' ${BLOB_HOST}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
