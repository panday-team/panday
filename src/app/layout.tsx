import "@/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { UserIdInitializer } from "@/components/user-id-initializer";

export const metadata: Metadata = {
  title: "Panday ",
  description: "Panday",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/auth/signin"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="en" className={`${geist.variable} dark`}>
        <body className="bg-background text-foreground min-h-dvh antialiased">
          <UserIdInitializer />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
