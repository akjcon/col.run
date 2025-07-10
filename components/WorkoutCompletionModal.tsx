"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, notes?: string) => Promise<void>;
  workoutType: string;
}

export default function WorkoutCompletionModal({
  isOpen,
  onClose,
  onSubmit,
  workoutType,
}: WorkoutCompletionModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotesInput = rating <= 3 || rating >= 8;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(rating, showNotesInput && notes ? notes : undefined);
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Workout Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-sm text-gray-600">
            Great job finishing:{" "}
            <span className="font-medium">{workoutType}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                How&apos;d you feel?
              </label>
              <span className="text-lg font-semibold">
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
              <div className="flex justify-between text-xs text-gray-500 mt-1">
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
            {showNotesInput && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
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
                  className="resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
