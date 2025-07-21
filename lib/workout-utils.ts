import { calculateWorkoutDates } from "@/lib/plan-utils";
import type { Workout, WeekPlan } from "@/lib/types";

export function getTodaysWorkout(
  weeksWithDates: Array<{ workouts: Workout[] }>
): Workout | undefined {
  const today = new Date();
  const todayLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return weeksWithDates
    .flatMap((week) => week.workouts)
    .find((workout) => {
      if (!workout.date) return false;
      const workoutDate = new Date(workout.date);
      const workoutLocal = new Date(
        workoutDate.getFullYear(),
        workoutDate.getMonth(),
        workoutDate.getDate()
      );
      return workoutLocal.getTime() === todayLocal.getTime();
    });
}

export function getWeeksWithDates(
  startDate: number | undefined,
  generatedAt: number | undefined,
  weeks: WeekPlan[] | undefined
): Array<{ weekNumber: number; workouts: Workout[] }> {
  if (weeks && startDate) {
    return calculateWorkoutDates(startDate, weeks);
  } else if (generatedAt && weeks) {
    return calculateWorkoutDates(generatedAt, weeks);
  }
  return [];
}
