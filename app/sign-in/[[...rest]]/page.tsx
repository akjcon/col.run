import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="h-full bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-serif text-xl font-light leading-tight tracking-tight text-neutral-900 sm:text-2xl">
              Welcome back
            </h2>
            <p className="font-serif text-sm leading-relaxed text-neutral-600">
              Access your personalized training plan and
              continue your mountain journey
            </p>
          </div>

          {/* Card container for Clerk component */}
          <div className="flex flex-col items-center justify-center px-6 sm:p-8">
            <SignIn />
          </div>

        </div>
      </div>
    </div>
  );
}
