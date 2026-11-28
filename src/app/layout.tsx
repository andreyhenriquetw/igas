import type { Metadata } from "next";
import "./globals.css";

const themeInitializationScript = `
  document.documentElement.dataset.theme = "dark";
`;

export const metadata: Metadata = {
  title: "ÍGAS",
  description: "Agenda e reservas do espaço de hospedagem.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ÍGAS",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/igaspreto.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
