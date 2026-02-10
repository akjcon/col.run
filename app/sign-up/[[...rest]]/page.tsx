import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="h-full bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
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
