import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Teatro Pablo Tesak | Gestión de actividades",
  description:
    "Sistema institucional de registro, seguimiento y reportes de actividades.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
