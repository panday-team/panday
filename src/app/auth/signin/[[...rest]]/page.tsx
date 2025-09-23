import { SignIn as SignInClerk } from "@clerk/nextjs";

export default function SignIn() {
  return (
    <>
      <section className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">Panday</h1>
        <div className="rounded-4xl bg-neutral-700 p-10 shadow-md">
          <SignInClerk />
        </div>
      </section>
    </>
  );
}
