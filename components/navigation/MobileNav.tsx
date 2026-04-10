"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton, useUser, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { navigationItems } from "./constants";
import { useChatContext } from "@/lib/chat-context";

export function MobileNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { toggleChat } = useChatContext();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 w-full border-b border-neutral-200 bg-white backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center px-4">
          {/* Mobile hamburger menu */}
          <button
            onClick={toggleMobileMenu}
            className="rounded-lg p-2 transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-50 active:scale-95"
            aria-label="Toggle menu"
          >
            <div className="relative">
              <Menu
                className={cn(
                  "h-5 w-5 transition-[transform,opacity] duration-200 ease-out",
                  isMobileMenuOpen
                    ? "rotate-90 opacity-0"
                    : "rotate-0 opacity-100"
                )}
              />
              <X
                className={cn(
                  "absolute left-0 top-0 h-5 w-5 transition-[transform,opacity] duration-200 ease-out",
                  isMobileMenuOpen
                    ? "rotate-0 opacity-100"
                    : "-rotate-90 opacity-0"
                )}
              />
            </div>
          </button>

          {/* Logo */}
          <Link href={isSignedIn ? "/home" : "/"} className="flex items-center">
            <Image src="/col_logo.svg" alt="col" width={70} height={70} />
          </Link>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/20 transition-opacity duration-200 ease-out",
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileMenu}
      />

      {/* Mobile menu drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 z-60 flex h-full w-72 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile menu header */}
        <div className="border-b border-neutral-100 bg-neutral-50 h-14 flex items-center px-4 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Image src="/col_logo.svg" alt="col" width={50} height={50} />
              <span className="text-lg font-normal text-neutral-900">
                col.run
              </span>
            </div>
            <button
              onClick={closeMobileMenu}
              className="ml-auto rounded-lg p-2 transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-100 active:scale-95"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Mobile menu content */}
        <div className="flex-1 p-4">
          {/* Authentication for mobile - only show if not signed in */}
          {!isSignedIn && (
            <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="mb-3 text-sm text-neutral-700">
                Sign in to access your training plan
              </p>
              <SignInButton mode="modal">
                <button className="w-full rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition-colors hover:bg-neutral-800">
                  Sign In
                </button>
              </SignInButton>
            </div>
          )}

          {/* Navigation links - only show if signed in */}
          {isSignedIn && (
            <nav className="space-y-1">
              {navigationItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={index}
                    href={item.href!}
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 rounded-lg p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-50 active:scale-[0.98] active:bg-neutral-100"
                  >
                    <IconComponent className="h-5 w-5 text-neutral-600" />
                    <span className="font-medium text-neutral-700">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  closeMobileMenu();
                  toggleChat();
                }}
                className="flex w-full items-center space-x-3 rounded-lg p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-50 active:scale-[0.98] active:bg-neutral-100"
              >
                <MessageCircle className="h-5 w-5 text-neutral-600" />
                <span className="font-medium text-neutral-700">Coach</span>
              </button>
            </nav>
          )}
        </div>

        {/* User profile section - pinned to bottom */}
        {isSignedIn && (
          <div className="border-t border-neutral-100 bg-neutral-50 p-4">
            <div className="flex items-center space-x-3">
              <UserButton />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-neutral-500 truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={closeMobileMenu}
                aria-label="Settings"
                className="relative rounded-md p-2.5 text-neutral-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-600 active:scale-90"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
