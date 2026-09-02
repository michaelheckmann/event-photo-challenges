import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import { qrcode } from "vite-plugin-qrcode";
import { eventConfig } from "./src/shared/event-config";

const createManifest = () => {
  const locale = eventConfig.defaultLocale;
  return JSON.stringify(
    {
      name: eventConfig.name[locale],
      short_name: eventConfig.shortName[locale],
      description: eventConfig.description[locale],
      icons: [
        {
          src: "/web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      theme_color: eventConfig.theme.manifestBackground,
      background_color: eventConfig.theme.manifestBackground,
      display: "standalone",
    },
    null,
    2,
  );
};

const eventMetadata = (): Plugin => ({
  name: "event-metadata",
  configureServer(server) {
    server.middlewares.use("/site.webmanifest", (_request, response) => {
      response.setHeader("content-type", "application/manifest+json");
      response.end(createManifest());
    });
  },
  generateBundle() {
    this.emitFile({
      fileName: "site.webmanifest",
      source: createManifest(),
      type: "asset",
    });
  },
  transformIndexHtml(html) {
    const locale = eventConfig.defaultLocale;
    return html
      .replaceAll("%EVENT_NAME%", eventConfig.name[locale])
      .replaceAll("%EVENT_DESCRIPTION%", eventConfig.description[locale])
      .replaceAll("%EVENT_SHORT_NAME%", eventConfig.shortName[locale]);
  },
});

export default defineConfig({
  plugins: [eventMetadata(), react(), tailwindcss(), cloudflare(), qrcode()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/app"),
    },
  },
});
