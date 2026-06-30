import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import DiceRollerBubble from "./dice-roller-bubble";
import GlobalAuthMenu from "./global-auth-menu";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "NeedleWeb",
  description: "A focused web app for a small user base with one admi.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionClaims = readSessionClaims(token);

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {sessionClaims ? <GlobalAuthMenu /> : null}
        {children}
        <DiceRollerBubble />
      </body>
    </html>
  );
}
