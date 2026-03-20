"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignUp, SignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";

// Emil Kowalski easing curves
const easeOutQuint = [0.23, 1, 0.32, 1] as const;
const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in" | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (isSignedIn) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-neutral-50">
      {/* Mountain background — always present, blur animates */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ filter: authMode ? "blur(6px)" : "blur(0px)" }}
        transition={{ duration: 0.3, ease: easeOutCubic }}
      >
        <img
          src="/mountain-bg.png"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,_rgba(250,250,249,0.95)_0%,_rgba(250,250,249,0.6)_50%,_rgba(250,250,249,0.15)_100%)]" />
      </motion.div>

      {/* Landing content — always in the DOM */}
      <div className="relative flex h-full flex-col items-center">
        <div className="flex-[1_1_50%]" />

        <motion.div
          className="flex flex-col items-center px-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.12, delayChildren: 0.1 },
            },
          }}
        >
          <motion.img
            src="/col_logo.svg"
            alt="col"
            className="mb-1 h-[40px] w-auto text-neutral-900 sm:h-[56px]"
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: {
                opacity: 0.8,
                scale: 1,
                transition: { duration: 0.4, ease: easeOutQuint },
              },
            }}
          />

          <motion.h1
            className="mt-4 font-serif text-[2.5rem] font-medium tracking-[0.08em] text-neutral-900 sm:mt-5 sm:text-5xl"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.35, ease: easeOutQuint },
              },
            }}
          >
            col
          </motion.h1>

          <motion.p
            className="mt-4 font-serif text-[0.95rem] tracking-wide text-neutral-500 sm:mt-5 sm:text-lg"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { duration: 0.3, ease: easeOutCubic },
              },
            }}
          >
            Running, simplified
          </motion.p>
          <motion.p
            className="mt-2 font-serif text-[0.8rem] tracking-wide text-neutral-400 sm:mt-2.5 sm:text-[0.95rem]"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { duration: 0.3, ease: easeOutCubic },
              },
            }}
          >
            Your plan. Your coach. Nothing else.
          </motion.p>

          <motion.div
            className="mt-8 sm:mt-10"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, ease: easeOutQuint },
              },
            }}
          >
            <Button
              size="lg"
              onClick={() => setAuthMode("sign-up")}
              className="rounded-full border-0 bg-neutral-900 px-8 py-3 font-serif text-sm font-medium text-white shadow-lg shadow-neutral-900/15 transition-all duration-150 ease-out hover:bg-neutral-800 hover:shadow-xl hover:shadow-neutral-900/20 active:scale-[0.97] sm:px-10 sm:py-4 sm:text-base"
            >
              Start Training
              <Play className="ml-2 h-3.5 w-3.5 fill-current" />
            </Button>
          </motion.div>

          <motion.div
            className="mt-5 font-serif text-[0.8rem] text-neutral-400 sm:text-sm"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { duration: 0.25, ease: easeOutCubic },
              },
            }}
          >
            <button
              onClick={() => setAuthMode("sign-in")}
              className="underline decoration-neutral-300 underline-offset-[3px] transition-colors duration-150 ease-out hover:text-neutral-600 hover:decoration-neutral-400"
            >
              Already have an account?
            </button>
          </motion.div>
        </motion.div>

        <div className="flex-[1_1_50%]" />
      </div>

      {/* Auth overlay */}
      <AnimatePresence>
        {authMode && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOutCubic }}
          >
            {/* Scrim */}
            <div
              className="absolute inset-0 bg-neutral-50/50"
              onClick={() => setAuthMode(null)}
            />

            {/* Close button */}
            <button
              onClick={() => setAuthMode(null)}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-neutral-500 transition-colors duration-150 ease-out hover:bg-neutral-200/50 hover:text-neutral-900 sm:right-6 sm:top-6"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Clerk component — paired with scrim, same easing */}
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: easeOutQuint }}
            >
              {authMode === "sign-up" ? (
                <SignUp
                  routing="hash"
                  forceRedirectUrl="/onboarding"
                  appearance={{
                    elements: {
                      rootBox: "mx-auto",
                      card: "shadow-xl shadow-neutral-900/10",
                    },
                  }}
                />
              ) : (
                <SignIn
                  routing="hash"
                  appearance={{
                    elements: {
                      rootBox: "mx-auto",
                      card: "shadow-xl shadow-neutral-900/10",
                    },
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
