import "@/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { type Metadata } from "next";
import { Inria_Sans } from "next/font/google";
import { UserIdInitializer } from "@/components/user-id-initializer";

export const metadata: Metadata = {
  title: "Panday ",
  description: "Panday",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
};

const inriaSans = Inria_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  variable: "--font-inria-sans",
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
      <html lang="en" className={`${inriaSans.variable} dark`}>
        <body className="bg-background text-foreground min-h-dvh antialiased">
          <UserIdInitializer />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
