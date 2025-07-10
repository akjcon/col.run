"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mountain,
  Target,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user has completed onboarding
      // For now, redirect to home dashboard - later we can add onboarding check
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Mountain className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    // Will redirect via useEffect, but show loading state
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Mountain className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Mountain className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Trail Running
            <span className="text-blue-600 block">Training Plans</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get a personalized training plan based on the Training for the
            Uphill Athlete book, tailored to your experience, goals, and current
            fitness level.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 py-4 text-lg" asChild>
              <Link href="/sign-up">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
              asChild
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Personalized Plans</CardTitle>
              <CardDescription>
                AI-generated training plans based on your running experience,
                weekly mileage, and race goals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>AI Coach Chat</CardTitle>
              <CardDescription>
                Get instant answers about your training, nutrition, recovery,
                and race strategy
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>Expert Knowledge</CardTitle>
              <CardDescription>
                Based on Training for the Uphill Athlete - proven methods for
                endurance athletes
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Tell Us About Yourself
              </h3>
              <p className="text-gray-600">
                Share your running experience, current fitness level, and race
                goals
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Your Plan</h3>
              <p className="text-gray-600">
                Our AI creates a personalized training plan with daily workouts
                and progression
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Train & Chat</h3>
              <p className="text-gray-600">
                Follow your plan and get coaching guidance through our AI
                assistant
              </p>
            </div>
          </div>
        </div>

        {/* What's Included */}
        <Card className="border shadow-sm mb-16">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">What&apos;s Included</CardTitle>
            <CardDescription>
              Everything you need for successful trail running
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Personalized 12-week training plan</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Daily workout details with zones and targets</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Strength training integration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Recovery and injury prevention guidance</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>AI coach chat for instant guidance</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Nutrition and fueling strategies</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Race strategy development</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Progress tracking and plan adjustments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Trail Running?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join runners who are achieving their goals with science-based
            training
          </p>
          <Button size="lg" className="px-8 py-4 text-lg" asChild>
            <Link href="/sign-up">
              Start Your Free Plan <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
