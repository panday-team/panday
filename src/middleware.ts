import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

<<<<<<< HEAD
const isProtectedRoute = createRouteMatcher(["/roadmap(.*)", "/profile(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Protect authenticated routes
=======
const isProtectedRoute = createRouteMatcher(["/roadmap(.*)"]);

export default clerkMiddleware(async (auth, req) => {
>>>>>>> 089acaa (changed roadmap to be a protected route & added simple homepage)
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
