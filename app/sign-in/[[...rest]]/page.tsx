import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="h-full bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-md">
          {/* Header with col branding */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-serif text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
              col
            </h1>
            <div className="mb-6 font-serif text-xs tracking-[0.2em] text-neutral-500">
              /kɒl/
            </div>
            <h2 className="mb-3 font-serif text-xl font-light leading-tight tracking-tight text-neutral-900 sm:text-2xl">
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

          {/* Footer text */}
          <div className="mt-6 text-center">
            <p className="font-serif text-xs text-neutral-500">
              &quot;Every great ascent begins with
              understanding the col ahead&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
