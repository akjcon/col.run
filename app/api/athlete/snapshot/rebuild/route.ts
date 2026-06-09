import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildAthleteSnapshot } from "@/lib/athlete-snapshot";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await buildAthleteSnapshot(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Snapshot rebuild error:", error);
    return NextResponse.json(
      { error: "Failed to rebuild snapshot" },
      { status: 500 }
    );
  }
}
