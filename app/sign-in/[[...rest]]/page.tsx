import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="h-full bg-neutral-50">
      <div className="px-4 sm:px-6 py-6 sm:py-20">
        <div className="max-w-md mx-auto">
          {/* Header with col branding */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-neutral-900 mb-2 tracking-tight">
              col
            </h1>
            <div className="text-neutral-500 text-xs tracking-[0.2em] font-serif mb-6">
              /kɒl/
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-light text-neutral-900 mb-3 tracking-tight leading-tight">
              Welcome back
            </h2>
            <p className="text-neutral-600 text-sm leading-relaxed font-serif">
              Access your personalized training plan and continue your mountain
              journey
            </p>
          </div>

          {/* Card container for Clerk component */}
          <div className="flex flex-col items-center justify-center px-6 sm:p-8">
            <SignIn />
          </div>

          {/* Footer text */}
          <div className="text-center mt-6">
            <p className="text-xs text-neutral-500 font-serif">
              &quot;Every great ascent begins with understanding the col
              ahead&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
