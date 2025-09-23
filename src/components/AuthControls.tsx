"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export const AuthControls = () => (
  <div className="flex items-center gap-3">
    <SignedOut>
      <SignInButton mode="modal">
        <button className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400">
          Sign in
        </button>
      </SignInButton>
    </SignedOut>
    <SignedIn>
      <UserButton afterSignOutUrl="/" />
    </SignedIn>
  </div>
);

AuthControls.displayName = "AuthControls";
