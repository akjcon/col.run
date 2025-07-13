import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
            <p className="text-neutral-600 text-sm leading-relaxed font-serif">
              Get your personalized trail running training plan based on{" "}
              <em className="font-medium">Training for the Uphill Athlete</em>
            </p>
          </div>

          {/* Card container for Clerk component */}
          <div className="flex flex-col items-center justify-center px-6 sm:p-8">
            <SignUp />
          </div>
        </div>
      </div>
    </div>
  );
}
