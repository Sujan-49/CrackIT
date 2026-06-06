import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CrackIT by SJ DEVS",
  description: "Placement Command Center for students. Think. Code. Build. Crack."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
