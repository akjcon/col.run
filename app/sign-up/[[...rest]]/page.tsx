import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
            <p className="font-serif text-sm leading-relaxed text-neutral-600">
              Get your personalized trail running training
              plan based on{" "}
              <em className="font-medium">
                Training for the Uphill Athlete
              </em>
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
