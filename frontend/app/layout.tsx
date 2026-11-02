import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Afromind Agents",
  description: "Build intelligent agents. Connect workflows. Automate execution.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
