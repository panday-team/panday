import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AuthControls } from "@/components/AuthControls";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to Panday
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Your career roadmap companion
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <SignedOut>
            <div className="flex flex-col items-center gap-4">
              <AuthControls />
              <div className="flex items-center gap-3">
                <div className="bg-muted-foreground h-px w-12" />
                <span className="text-muted-foreground text-sm">or</span>
                <div className="bg-muted-foreground h-px w-12" />
              </div>
              <Link
                href="/roadmap"
                className="rounded-md border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 shadow-sm transition hover:bg-slate-800 hover:text-white"
              >
                Browse as Guest
              </Link>
            </div>
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
    </div>
  );
}
