import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { join } from "path";
import { UserData } from "./types";
import { calculateCurrentWeek } from "./plan-utils";

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
      join(process.cwd(), "lib", "optimized_book.md"),
      join(process.cwd(), "optimized_book.md"),
      join(process.cwd(), "..", "optimized_book.md"),
      join(process.cwd(), "..", "..", "optimized_book.md"),
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

// Chat system prompt for ongoing conversations
function generateChatPrompt(userData: UserData): string {
  const background = userData.trainingBackground;
  const plan = userData.activePlan;

  if (!background || !plan) {
    return `You are an expert trail running coach based on "Training for the Uphill Athlete" principles.
    The user hasn't completed their profile yet. Help them with general running advice while encouraging them to complete their onboarding for personalized guidance.`;
  }

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

  const currentWeek = calculateCurrentWeek(plan.startDate, plan.totalWeeks);
  const currentPhase = plan.phases?.find(
    (p) => currentWeek >= p.startWeek && currentWeek <= p.endWeek
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
- Current phase: ${currentPhase?.name || "Base Building"}

COACHING GUIDELINES:
1. Reference their specific training plan when relevant
2. Consider their experience level and background
3. Draw from uphill athlete methodology
4. Be encouraging but realistic about adaptations
5. Prioritize injury prevention and long-term development
6. Suggest modifications based on how they're feeling

Provide specific, actionable advice based on their personalized plan and the principles in the book.`;
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
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>,
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
