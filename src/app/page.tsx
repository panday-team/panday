import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AuthControls } from "@/components/AuthControls";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to Panday
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Your career roadmap companion
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <SignedOut>
            <AuthControls />
          </SignedOut>

          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">You&apos;re signed in!</p>
              <div className="flex gap-3">
                <Link
                  href="/roadmap"
                  className="rounded-md bg-teal-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-teal-400"
                >
                  View Roadmap
                </Link>
                <Link
                  href="/profile"
                  className="rounded-md border border-teal-500 px-6 py-3 text-sm font-semibold text-teal-500 shadow-sm transition hover:bg-teal-500 hover:text-slate-950"
                >
                  Profile Settings
                </Link>
              </div>
              <AuthControls />
            </div>
          </SignedIn>
        </div>
      </div>

      <div className="absolute top-4 right-4 md:top-10 md:right-10">
        <ThemeToggle />
      </div>
    </div>
  );
}
