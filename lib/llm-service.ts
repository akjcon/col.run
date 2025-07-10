import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { join } from "path";
import { UserData, TrainingBackground, TrainingPlan } from "./types";
import {
  calculatePlanLength,
  getPlanTypeString,
  getPhaseDistribution,
} from "./plan-utils";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for book content to avoid re-reading
let bookContentCache: string | null = null;

// Load the book content once and cache it
async function getBookContent(): Promise<string> {
  if (bookContentCache) {
    return bookContentCache;
  }

  try {
    // Try multiple possible paths for the book
    const possiblePaths = [
      join(process.cwd(), "..", "..", "optimized_book.md"),
      join(process.cwd(), "..", "..", "combined_book.md"),
      join(process.cwd(), "..", "optimized_book.md"),
      join(process.cwd(), "..", "combined_book.md"),
      "/Users/jackconsenstein/Desktop/bookrip/optimized_book.md",
      "/Users/jackconsenstein/Desktop/bookrip/combined_book.md",
    ];

    for (const path of possiblePaths) {
      try {
        const content = await readFile(path, "utf-8");
        bookContentCache = content;
        console.log(`Successfully loaded book content from: ${path}`);
        return content;
      } catch {
        // Continue to next path
        continue;
      }
    }

    throw new Error("Could not find book content in any expected location");
  } catch (error) {
    console.error("Error loading book content:", error);
    return "Book content not available. Please ensure the book file is accessible.";
  }
}

// Generate training plan system prompt
function generateTrainingPlanPrompt(background: TrainingBackground): string {
  // Calculate plan length based on race date
  const planLength = calculatePlanLength(background.goals.raceDate);
  const planType = getPlanTypeString(background.goals.raceDistance, planLength);
  const phaseDistribution = getPhaseDistribution(planLength);

  return `You are an expert trail running coach creating a personalized training plan based on "Training for the Uphill Athlete" principles.

USER PROFILE:
- Experience: ${background.experience}
- Current weekly mileage: ${background.weeklyMileage} miles
- Longest run: ${background.longestRun} miles
- Marathon PR: ${background.marathonPR || "Not provided"}
- Current fitness: ${background.currentFitness || "Not provided"}
- Athletic background: ${background.background || "Not provided"}
- Injury history: ${background.injuries || "None provided"}

RACE GOAL:
- Distance: ${background.goals.raceDistance}
- Target time: ${background.goals.targetTime || "Not specified"}
- Race date: ${
    background.goals.raceDate
      ? new Date(background.goals.raceDate).toLocaleDateString()
      : "Not provided"
  }
- Plan length: ${planLength} weeks (calculated from race date)

PHASE DISTRIBUTION GUIDANCE:
- Base phase: ${
    phaseDistribution.baseWeeks
  } weeks (aerobic development, volume building)
- Build phase: ${
    phaseDistribution.buildWeeks
  } weeks (add intensity, lactate threshold work)
${
  phaseDistribution.peakWeeks > 0
    ? `- Peak phase: ${phaseDistribution.peakWeeks} weeks (race-specific, high intensity)`
    : ""
}
- Taper phase: ${
    phaseDistribution.taperWeeks
  } weeks (reduce volume, maintain sharpness)

TASK: Create a comprehensive, personalized ${planLength}-week training plan following these requirements:

1. **Training Zones**: Create 5 heart rate zones based on their fitness level and background
2. **Training Phases**: Design a periodized plan with distinct phases (Base, Build, Peak, Taper)
3. **Weekly Structure**: Include varied workout types following uphill athlete principles
4. **Progression**: Ensure proper volume and intensity progression
5. **Specificity**: Match training to their goal race demands
6. **Recovery**: Include adequate recovery and injury prevention

OUTPUT FORMAT: Return a structured JSON object with this exact format:
{
  "planType": "${planType}",
  "totalWeeks": ${planLength},
  "zones": [
    {
      "zone": "Zone 1",
      "heartRate": "120-135 bpm",
      "pace": "9:30-10:00/mi",
      "description": "Very Easy/Recovery",
      "color": "bg-slate-100 text-slate-700 border-slate-200"
    }
    // ... 5 zones total
  ],
  "phases": [
    {
      "weeks": "1-4",
      "phase": "Base Building",
      "miles": "35-40",
      "vertical": "6,000-8,000 ft", 
      "focus": "Aerobic development and strength foundation"
    }
    // ... all phases
  ],
  "weeks": [
    {
      "weekNumber": 1,
      "phase": "Base Building",
      "targetMiles": "35-40",
      "targetVertical": "6,000-8,000 ft",
      "workouts": [
        {
          "day": "Monday",
          "type": "Rest/Active Recovery",
          "zone": "Recovery",
          "description": "Complete rest or gentle movement",
          "details": ["Optional 20-30 min walk", "Focus on sleep and nutrition"],
          "notes": "Complete recovery from weekend volume"
        }
        // ... all 7 days
      ]
    }
    // ... generate 4-5 sample weeks
  ],
  "coachingNotes": [
    "Key coaching insights based on their background",
    "Specific advice for their experience level"
  ]
}

Base the plan on uphill athlete methodology: aerobic base building, polarized training, back-to-back long runs for ultras, strength integration, and proper periodization. Adapt intensity and volume based on their experience level.

IMPORTANT: Structure the plan to peak for the race date. Work backwards from race day to ensure proper timing of each phase. The taper should end exactly on race day.`;
}

// Chat system prompt for ongoing conversations
function generateChatPrompt(userData: UserData): string {
  const background = userData.trainingBackground;
  const plan = userData.generatedProfile?.recommendedPlan;

  if (!background || !plan) {
    return `You are an expert trail running coach based on "Training for the Uphill Athlete" principles. 
    The user hasn't completed their profile yet. Help them with general running advice while encouraging them to complete their onboarding for personalized guidance.`;
  }

  // Get current week and today's workout
  const today = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayName = dayNames[today.getDay()];

  const currentWeek = plan.currentWeek || 1;
  const currentWeekPlan = plan.weeks?.find(
    (week) => week.weekNumber === currentWeek
  );
  const todaysWorkout = currentWeekPlan?.workouts?.find(
    (workout) => workout.day === todayName
  );

  return `You are an expert trail running coach with access to "Training for the Uphill Athlete" book. You're coaching this specific athlete:

ATHLETE PROFILE:
- Experience: ${background.experience}
- Background: ${background.background || "Not provided"}
- Current volume: ${background.weeklyMileage} miles/week
- Goal: ${background.goals.raceDistance} race
- Target time: ${background.goals.targetTime || "Not specified"}

CURRENT STATUS:
- Today: ${todayName}
- Training week: ${currentWeek} of ${plan.totalWeeks}
- Current phase: ${currentWeekPlan?.phase || "Base Building"}
${
  todaysWorkout
    ? `- Today's workout: ${todaysWorkout.type} - ${todaysWorkout.description}`
    : "- Rest day today"
}

HEART RATE ZONES:
${
  plan.zones
    ?.map((zone) => `${zone.zone}: ${zone.heartRate} - ${zone.description}`)
    .join("\n") || "Zones not available"
}

COACHING GUIDELINES:
1. Reference their specific training plan and today's workout when relevant
2. Use their actual heart rate zones and training data
3. Consider their experience level and background
4. Draw from uphill athlete methodology
5. Be encouraging but realistic about adaptations
6. Prioritize injury prevention and long-term development
7. Suggest modifications based on how they're feeling

Provide specific, actionable advice based on their personalized plan and the principles in the book.`;
}

// Full context LLM (for training plan generation, detailed coaching)
export async function generateTrainingPlan(
  background: TrainingBackground
): Promise<TrainingPlan> {
  try {
    const bookContent = await getBookContent();
    const prompt = generateTrainingPlanPrompt(background);

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // Use full sonnet for complex generation
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for structured output
      system: `${prompt}\n\nBOOK REFERENCE:\n${bookContent}`,
      messages: [
        {
          role: "user",
          content:
            "Create my personalized training plan based on my profile. Return only the JSON object, no additional text.",
        },
      ],
    });

    const message =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    try {
      const planData = JSON.parse(message);

      // Add metadata
      const trainingPlan: TrainingPlan = {
        ...planData,
        id: `plan-${Date.now()}`,
        userId: "to-be-set", // Will be set by calling function
        startDate: new Date(),
        currentWeek: 1,
        generatedAt: new Date(),
      };

      return trainingPlan;
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", parseError);
      throw new Error("Invalid training plan format received from LLM");
    }
  } catch (error) {
    console.error("Error generating training plan:", error);
    throw new Error("Failed to generate training plan");
  }
}

// Quick context LLM (for simple Q&A, quick responses)
export async function quickChatResponse(
  message: string,
  userData?: UserData
): Promise<string> {
  try {
    let systemPrompt =
      "You are a helpful trail running coach. Provide brief, actionable advice.";

    if (userData?.trainingBackground) {
      systemPrompt = `You are a trail running coach. The user is ${userData.trainingBackground.experience} level, training for ${userData.trainingBackground.goals.raceDistance}. Give brief, helpful advice.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Faster, cheaper model
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Error in quick chat response:", error);
    return "Sorry, I'm having trouble responding right now. Please try again.";
  }
}

// Full context LLM (for detailed coaching with book knowledge)
export async function fullChatResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userData: UserData
): Promise<string> {
  try {
    const bookContent = await getBookContent();
    const systemPrompt = generateChatPrompt(userData);

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // Full model with book context
      max_tokens: 1500,
      temperature: 0.7,
      system: `${systemPrompt}\n\nBOOK REFERENCE:\n${bookContent}`,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in full chat response:", error);
    return "Sorry, I'm having trouble accessing my training knowledge right now. Please try again.";
  }
}

// Utility function to determine which LLM to use based on request type
export function shouldUseFullContext(message: string): boolean {
  const fullContextKeywords = [
    "training plan",
    "periodization",
    "heart rate zones",
    "race strategy",
    "nutrition",
    "altitude",
    "book",
    "uphill athlete",
    "detailed",
    "explain",
    "why",
    "how does",
    "methodology",
    "aerobic",
    "anaerobic",
    "lactate",
  ];

  const lowerMessage = message.toLowerCase();
  return fullContextKeywords.some((keyword) => lowerMessage.includes(keyword));
}
