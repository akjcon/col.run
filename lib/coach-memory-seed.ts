/**
 * Seed coach memory at end of onboarding from two sources:
 *   1. The free-text "anything else?" the user wrote (high-confidence)
 *   2. Recent Strava activity titles (low-confidence — many are sarcastic)
 *
 * Runs once per user after plan generation. Best-effort: failures are logged
 * but never break the surrounding flow.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getAdminDb } from "@/lib/firebase-admin";
import { executeCoachMemoryUpdate } from "@/lib/coach-memory";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ACTIVITY_NAME_LIMIT = 80;
const NOTE_CHAR_LIMIT = 200;
const MAX_MEMORIES = 10;

interface ActivityName {
  name: string;
  date: number;
}

interface ExtractedMemory {
  content: string;
  source: "user_notes" | "activity_names";
}

const SYSTEM_PROMPT = `You are seeding a running coach's memory about a new athlete based on what they told us during onboarding and the titles of their recent runs from Strava.

You will produce a JSON array of short, factual notes the coach should remember across every conversation. Each note must be a single sentence, ≤200 characters, written as if the coach is reminding themselves about the athlete.

You have two sources, with very different reliability:

1. USER NOTES — free-text the athlete wrote in response to "anything else your coach should know?" Treat this as **high-confidence**. Convert each distinct fact into its own memory note, paraphrased concisely. If they say nothing, skip this source.

2. ACTIVITY TITLES — names from recent Strava runs. Treat this as **low-confidence**. Strava titles are often jokes, sarcasm, generic ("morning run"), or running puns. Only extract a memory if you are confident the title is genuine and substantive. Examples:
   - "Easy 5mi - sore achilles" → genuine, write a memory about the achilles
   - "Death march from hell" → almost certainly sarcasm, ignore
   - "Tune-up before WS100 in June" → genuine race goal
   - "Suffered like a dog" → vague hyperbole, ignore
   - "Recovery jog post-marathon" → genuine, but only useful if recent and the marathon name is named
   When a theme appears in multiple titles (e.g. several runs mention the same injury or named race), confidence goes up. A single ambiguous title is not enough.

Rules:
- Prefer fewer, higher-confidence memories over many uncertain ones. It's fine to return [] from activity titles if nothing is clearly genuine.
- Don't restate facts the coach can derive from data the system already has (weekly mileage, pace, race date, distance). Only capture context-style facts (injuries, life constraints, training nuance, named events not yet captured elsewhere).
- Don't include opinions or recommendations. Just facts.
- Each memory should stand alone — written so the coach understands it without seeing the source.

Return ONLY a JSON array, no preamble. Each item: { "content": string, "source": "user_notes" | "activity_names" }. Empty array is fine.`;

function buildUserPrompt(
  userNotes: string | undefined,
  activityNames: ActivityName[]
): string {
  const parts: string[] = [];

  parts.push("USER NOTES:");
  parts.push(userNotes?.trim() ? userNotes.trim() : "(none provided)");
  parts.push("");
  parts.push(`ACTIVITY TITLES (most recent first, up to ${ACTIVITY_NAME_LIMIT}):`);
  if (activityNames.length === 0) {
    parts.push("(none available)");
  } else {
    for (const a of activityNames) {
      const date = new Date(a.date).toISOString().slice(0, 10);
      parts.push(`- [${date}] ${a.name}`);
    }
  }

  return parts.join("\n");
}

function parseMemories(raw: string): ExtractedMemory[] {
  // Strip code-fence wrappers some models add despite instructions.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((m): m is ExtractedMemory => {
      if (!m || typeof m !== "object") return false;
      const obj = m as { content?: unknown; source?: unknown };
      return (
        typeof obj.content === "string" &&
        obj.content.trim().length > 0 &&
        obj.content.length <= NOTE_CHAR_LIMIT &&
        (obj.source === "user_notes" || obj.source === "activity_names")
      );
    })
    .slice(0, MAX_MEMORIES);
}

async function loadRecentActivityNames(userId: string): Promise<ActivityName[]> {
  const db = getAdminDb();
  // 12 weeks ≈ 84 days — matches the window we use for the fitness profile.
  const sinceMs = Date.now() - 84 * 24 * 60 * 60 * 1000;
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("activities")
    .where("date", ">=", sinceMs)
    .orderBy("date", "desc")
    .limit(ACTIVITY_NAME_LIMIT)
    .get();

  const out: ActivityName[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as { name?: unknown; date?: unknown };
    if (typeof data.name === "string" && typeof data.date === "number") {
      out.push({ name: data.name, date: data.date });
    }
  }
  return out;
}

interface SeedResult {
  written: number;
  skipped: boolean;
  reason?: string;
}

export async function seedCoachMemoriesFromOnboarding(
  userId: string,
  userNotes: string | undefined
): Promise<SeedResult> {
  const trimmedNotes = userNotes?.trim() || "";
  let activityNames: ActivityName[] = [];
  try {
    activityNames = await loadRecentActivityNames(userId);
  } catch (err) {
    console.warn("Coach-memory seed: failed to load activities:", err);
  }

  if (!trimmedNotes && activityNames.length === 0) {
    return { written: 0, skipped: true, reason: "no inputs" };
  }

  let raw: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(trimmedNotes, activityNames) }],
    });
    const block = response.content[0];
    raw = block?.type === "text" ? block.text : "";
  } catch (err) {
    console.error("Coach-memory seed: LLM call failed:", err);
    return { written: 0, skipped: true, reason: "llm error" };
  }

  const memories = parseMemories(raw);
  if (memories.length === 0) {
    return { written: 0, skipped: false };
  }

  await executeCoachMemoryUpdate(userId, {
    additions: memories.map((m) => m.content),
  });

  return { written: memories.length, skipped: false };
}
