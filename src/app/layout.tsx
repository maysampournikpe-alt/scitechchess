import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/figtree";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "ChessMastery AI: your personal chess coach, free", template: "%s | ChessMastery AI" },
  description: "Free chess training that adapts to you: assessment, tactics, openings, middlegame plans, endgames and a daily plan built from your own results.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a1228" };

// Applies the saved theme before first paint, so the page never flashes the wrong colours.
const themeScript = `try{var t=localStorage.getItem("cm-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
