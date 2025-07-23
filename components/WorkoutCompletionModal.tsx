"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface WorkoutCompletionModalProps {
  onSubmit: (rating: number, notes?: string) => Promise<void>;
  workoutType: string;
  trigger: React.ReactNode;
}

export default function WorkoutCompletionModal({
  onSubmit,
  workoutType,
  trigger,
}: WorkoutCompletionModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const showNotesInput = rating <= 3 || rating >= 8;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(rating, showNotesInput && notes ? notes : undefined);
      setIsOpen(false);
      setRating(5);
      setNotes("");
    } catch (error) {
      console.error("Error submitting workout completion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (value: number) => {
    if (value <= 2) return "Awful";
    if (value <= 4) return "Tough";
    if (value <= 6) return "Okay";
    if (value <= 8) return "Good";
    return "Incredible";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-neutral-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-900">
            <CheckCircle2 className="h-5 w-5 text-[#E98A15]" />
            Workout Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="text-sm text-neutral-600">
            Great job finishing:{" "}
            <span className="font-medium text-neutral-800">{workoutType}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">
                How&apos;d you feel?
              </label>
              <span className="text-lg font-semibold text-neutral-900">
                {rating} - {getRatingLabel(rating)}
              </span>
            </div>

            <div className="px-2">
              <Slider
                value={[rating]}
                onValueChange={(value) => setRating(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>1 - Awful</span>
                <span>10 - Incredible</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              showNotesInput ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                Anything in particular?
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  rating <= 3
                    ? "What made it challenging today?"
                    : "What went really well?"
                }
                className="resize-none border-neutral-200 placeholder:text-neutral-300 text-neutral-700 focus:border-neutral-400"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-800"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-neutral-900 text-white hover:bg-neutral-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner variant="button" size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Log Workout"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
