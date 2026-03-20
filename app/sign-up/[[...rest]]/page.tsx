"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-50">
      {/* Mountain background — blur animates in */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ filter: "blur(0px)" }}
        animate={{ filter: "blur(4px)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <img
          src="/mountain-bg.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-neutral-50/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Close button */}
      <Link
        href="/"
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-200/50 hover:text-neutral-900 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </Link>

      {/* Clerk sign-up */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      >
        <SignUp
          forceRedirectUrl="/onboarding"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl shadow-neutral-900/10",
            },
          }}
        />
      </motion.div>
    </div>
  );
}
