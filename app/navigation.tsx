"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mountain,
  Menu,
  X,
  Home,
  Target,
  Dumbbell,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton, useUser, SignInButton } from "@clerk/nextjs";
import Image from "next/image";

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSignedIn, user } = useUser();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    {
      href: "/home",
      label: "Dashboard",
      icon: Home,
      description: "Your training dashboard",
    },
    {
      href: "/overview",
      label: "Overview",
      icon: Target,
      description: "Training plan summary",
    },
    {
      href: "/phase/base",
      label: "Phases",
      icon: Calendar,
      description: "12-week progression",
    },
    {
      href: "/strength",
      label: "Strength",
      icon: Dumbbell,
      description: "Power & conditioning",
    },
    {
      href: "/chat",
      label: "AI Chat",
      icon: MessageCircle,
      description: "AI training assistant",
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center px-4">
          {/* Mobile hamburger menu */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 md:hidden rounded-lg hover:bg-gray-100 transition-colors relative group"
            aria-label="Toggle menu"
          >
            <div className="relative">
              <Menu
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  isMobileMenuOpen
                    ? "rotate-90 opacity-0"
                    : "rotate-0 opacity-100"
                )}
              />
              <X
                className={cn(
                  "h-5 w-5 absolute top-0 left-0 transition-all duration-300",
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

          {/* Desktop navigation */}
          <div className="hidden md:flex flex-1 items-center justify-end space-x-6 text-sm">
            {isSignedIn &&
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground hover:text-primary transition-colors font-normal"
                >
                  {link.label}
                </Link>
              ))}

            {/* Authentication */}
            {isSignedIn ? (
              <div className="flex items-center space-x-3">
                {user?.firstName && (
                  <span className="text-sm text-gray-600 hidden lg:block">
                    Welcome, {user?.firstName}
                  </span>
                )}
                <UserButton />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity duration-300"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile menu drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 bg-white z-50 transform transition-all duration-300 ease-out md:hidden border-r border-gray-200",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Mobile menu header */}
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <Mountain className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">col</h2>
                <p className="text-gray-500 text-sm">Navigation</p>
              </div>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Mobile menu links */}
        <div className="flex flex-col p-6 space-y-2">
          {/* Authentication for mobile */}
          {!isSignedIn ? (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-3">
                Sign in to access your training plan
              </p>
              <SignInButton mode="modal">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                  Sign In
                </button>
              </SignInButton>
            </div>
          ) : (
            <>
              {/* User info */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <UserButton />
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              {navLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200",
                      "transform hover:scale-[1.01] active:scale-[0.99]",
                      isMobileMenuOpen ? "animate-in slide-in-from-left" : ""
                    )}
                    style={{
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-all duration-200">
                      <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-200">
                        {link.label}
                      </p>
                      <p className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
                        {link.description}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">
              12-Week Trail Running Program
            </p>
            <div className="flex justify-center space-x-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-1 rounded-full transition-colors duration-200",
                    i < 1 ? "bg-blue-500" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Week 1 - Base Building
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
