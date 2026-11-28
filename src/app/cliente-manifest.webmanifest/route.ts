import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      id: "/cliente",
      name: "ÍGAS Clientes",
      short_name: "ÍGAS Clientes",
      description: "Agendamento e informações do Balneário Ígas.",
      start_url: "/cliente",
      scope: "/cliente",
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
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Type": "application/manifest+json",
      },
    },
  );
}
