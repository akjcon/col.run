import { NextRequest, NextResponse } from "next/server";
import { generateTrainingPlan } from "@/lib/llm-service";
import { saveTrainingPlan } from "@/lib/firestore";
import { TrainingBackground } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      trainingBackground,
    }: {
      userId: string;
      trainingBackground: TrainingBackground;
    } = await req.json();

    if (!userId || !trainingBackground) {
      return NextResponse.json(
        { error: "Missing userId or trainingBackground" },
        { status: 400 }
      );
    }

    // Generate the training plan using LLM
    console.log("Generating training plan for user:", userId);
    const generatedPlan = await generateTrainingPlan(trainingBackground);

    // Set the user ID and start date in the plan
    generatedPlan.userId = userId;
    generatedPlan.startDate = Date.now(); // Set plan start date to today

    // Save the plan to Firebase
    const planId = await saveTrainingPlan(userId, generatedPlan);
    console.log("Training plan saved with ID:", planId);

    return NextResponse.json({
      success: true,
      planId,
      message: "Training plan generated and saved successfully",
    });
  } catch (error) {
    console.error("Error generating training plan:", error);
    return NextResponse.json(
      {
        error: "Failed to generate training plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
