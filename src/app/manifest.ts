import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ÍGAS Dashboard",
    short_name: "ÍGAS",
    description: "Agenda e reservas do espaço de hospedagem.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b24",
    theme_color: "#0b0b24",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
