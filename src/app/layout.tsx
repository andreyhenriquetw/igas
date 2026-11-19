import type { Metadata } from "next";
import "./globals.css";

const themeInitializationScript = `
  try {
    const theme = localStorage.getItem("agenda-theme");
    if (theme === "dark" || theme === "light") {
      document.documentElement.dataset.theme = theme;
    }
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
`;

export const metadata: Metadata = {
  title: "Meu espaço | Agenda",
  description: "Agenda e reservas do espaço de hospedagem.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
