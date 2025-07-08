import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";

// Helper function to get current training day
function getCurrentTrainingDay() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const days = [
    "Sunday", // 0
    "Monday", // 1
    "Tuesday", // 2
    "Wednesday", // 3
    "Thursday", // 4
    "Friday", // 5
    "Saturday", // 6
  ];

  return days[dayOfWeek];
}

// Training schedule data
const getTrainingPlan = () => {
  const today = getCurrentTrainingDay();

  return {
    currentDay: today,
    currentWeek: 1, // For now, assume week 1 - could be made dynamic
    heartRateZones: {
      "Zone 1": "<130 HR - Very Easy/Recovery (feels almost too easy)",
      "Zone 2": "130-140 HR - Aerobic Capacity (comfortable, conversational)",
      "Zone 3": "140-165 HR - Threshold (comfortably hard, sustainable)",
      "Zone 4": "165-180 HR - Above Threshold (hard, challenging effort)",
      "Zone 5": "180+ HR - Max/Sprint (very hard, unsustainable)",
    },
    athleteProfile: {
      background: "Former D1 Nordic skier with excellent aerobic base",
      currentVolume: "30-50 miles/week",
      marathonPR: "2:57 (current fitness ~3:20)",
      easyPace: "~9:00/mi at 137 HR (Zone 2)",
      thresholdFeel: "155-170 HR from skiing background",
      aerobicDevelopment: "Strong - small AeT-LT gap",
    },
    weeklySchedule: {
      Monday:
        "Rest/Active Recovery - Complete rest or 20-30 min easy walk/bike",
      Tuesday:
        "Zone 1-2 Run + Strength - 6-8 miles Z1/Z2 mix with 8×15 sec pickups at Z4 (165-180 HR) + PM strength",
      Wednesday:
        "Zone 2 Sustained - 60-75 minutes at 130-140 HR, 1,500-2,000 ft vertical",
      Thursday:
        "Recovery + Hill Sprints - AM: 4-5 miles Z1 (<130 HR), PM: 8×10 sec hill sprints at 180+ HR",
      Friday: "Easy Run - 5-6 miles Z1, 800 ft vertical",
      Saturday:
        "Long Run #1 - 10-12 miles Z1-Z2 mix, 2,500-3,000 ft vertical, practice nutrition",
      Sunday:
        "Long Run #2 - 8-10 miles Z1 back-to-back, 2,000 ft vertical, depleted glycogen training",
    },
    weeklyTotals: {
      miles: "45-50 miles/week",
      vertical: "8,000-10,000 ft/week",
    },
    raceGoal:
      "50K trail race on September 14th, 31 miles with 10,000ft vertical",
  };
};

interface TrainingPlan {
  currentDay: string;
  currentWeek: number;
  heartRateZones: Record<string, string>;
  athleteProfile: Record<string, string>;
  weeklySchedule: Record<string, string>;
  weeklyTotals: Record<string, string>;
  raceGoal: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const getSystemPrompt = (trainingPlan: TrainingPlan, bookContent: string) => {
  return `You are an expert trail running coach and training advisor. You have access to the complete "Training for the Uphill Athlete" book and the user's personalized 12-week 50K training plan.

ATHLETE PROFILE:
- Background: ${trainingPlan.athleteProfile.background}
- Current volume: ${trainingPlan.athleteProfile.currentVolume}
- Marathon PR: ${trainingPlan.athleteProfile.marathonPR}
- Easy pace: ${trainingPlan.athleteProfile.easyPace}
- Threshold feel: ${trainingPlan.athleteProfile.thresholdFeel}
- Aerobic development: ${trainingPlan.athleteProfile.aerobicDevelopment}

CURRENT STATUS:
- Today is: ${trainingPlan.currentDay}
- Current week: ${trainingPlan.currentWeek} (Base + Strength Phase)
- Today's workout: ${
    trainingPlan.weeklySchedule[
      trainingPlan.currentDay as keyof typeof trainingPlan.weeklySchedule
    ]
  }

CUSTOMIZED HEART RATE ZONES (based on skiing background):
${Object.entries(trainingPlan.heartRateZones)
  .map(([zone, range]) => `- ${zone}: ${range}`)
  .join("\n")}

WEEKLY SCHEDULE:
${Object.entries(trainingPlan.weeklySchedule)
  .map(([day, workout]) => `- ${day}: ${workout}`)
  .join("\n")}

RACE GOAL: ${trainingPlan.raceGoal}

You should:
1. Provide specific, actionable advice based on the training book principles and the user's customized plan
2. Consider their Nordic skiing background and strong aerobic development when giving advice
3. Reference today's specific workout when relevant
4. Use their actual heart rate zones (not generic ones)
5. Be encouraging but realistic about training adaptations
6. Always prioritize safety and injury prevention
7. Suggest modifications based on how they're feeling

The user can ask about:
- Today's workout specifics and how to execute it
- Nutrition and hydration strategies
- Recovery and fatigue management
- Heart rate zone confusion
- Race strategy and pacing
- Training modifications
- Book concepts and how they apply to their plan

Here's the complete Training for the Uphill Athlete book content for reference:
${bookContent}

Answer questions helpfully, drawing from both the book knowledge and their specific plan. Keep responses concise but thorough.`;
};

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json();

    // Get training plan data
    const trainingPlan = getTrainingPlan();

    // Read the book content
    let bookContent = "";
    try {
      const bookPath = join(process.cwd(), "..", "..", "optimized_book.md");
      bookContent = await readFile(bookPath, "utf-8");
    } catch (error) {
      console.error("Could not read book file:", error);
      bookContent = "Book content not available";
    }

    // Prepare the system prompt
    const systemPrompt = getSystemPrompt(trainingPlan, bookContent);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude-3 API
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const message =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "Sorry, I couldn't generate a response.";

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
