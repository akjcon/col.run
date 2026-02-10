"use client";

import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";

type Assessment = "too_high" | "too_low" | "appropriate" | "too_aggressive" | "too_conservative" | "not_enough" | "too_much";

interface FeedbackData {
  overallRating: number;
  volumeAssessment: Assessment;
  longRunAssessment: Assessment;
  recoveryAssessment: Assessment;
  notes: string;
}

interface FeedbackFormProps {
  planId: string;
  athleteExperience: string;
  raceType: string;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-neutral-300 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function AssessmentSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Assessment;
  options: { value: Assessment; label: string }[];
  onChange: (v: Assessment) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              value === opt.value
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FeedbackForm({ planId, athleteExperience, raceType, onSubmit }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [volume, setVolume] = useState<Assessment>("appropriate");
  const [longRun, setLongRun] = useState<Assessment>("appropriate");
  const [recovery, setRecovery] = useState<Assessment>("appropriate");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        overallRating: rating,
        volumeAssessment: volume,
        longRunAssessment: longRun,
        recoveryAssessment: recovery,
        notes,
      });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-green-200 rounded-xl bg-green-50 p-6 text-center">
        <p className="text-green-800 font-medium">Thank you for your feedback!</p>
        <p className="text-green-600 text-sm mt-1">
          Your input helps improve future plan generations.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-neutral-200 rounded-xl bg-white shadow-sm">
      <div className="p-6 border-b border-neutral-100">
        <h3 className="font-serif text-xl font-light text-neutral-900">
          Rate This Plan
        </h3>
        <p className="text-sm text-neutral-500 mt-1">
          Your feedback helps improve plan generation
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Overall Rating
          </label>
          <StarRating value={rating} onChange={setRating} />
          {rating === 0 && (
            <p className="text-xs text-neutral-400 mt-1">Click to rate</p>
          )}
        </div>

        {/* Volume Assessment */}
        <AssessmentSelect
          label="Volume/Mileage"
          value={volume}
          onChange={setVolume}
          options={[
            { value: "too_low", label: "Too Low" },
            { value: "appropriate", label: "Appropriate" },
            { value: "too_high", label: "Too High" },
          ]}
        />

        {/* Long Run Assessment */}
        <AssessmentSelect
          label="Long Runs"
          value={longRun}
          onChange={setLongRun}
          options={[
            { value: "too_conservative", label: "Too Conservative" },
            { value: "appropriate", label: "Appropriate" },
            { value: "too_aggressive", label: "Too Aggressive" },
          ]}
        />

        {/* Recovery Assessment */}
        <AssessmentSelect
          label="Recovery/Rest"
          value={recovery}
          onChange={setRecovery}
          options={[
            { value: "not_enough", label: "Not Enough" },
            { value: "appropriate", label: "Appropriate" },
            { value: "too_much", label: "Too Much" },
          ]}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What would you change? Any specific issues?"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="px-6 pb-6">
        <button
          type="submit"
          disabled={rating === 0 || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit Feedback
        </button>
      </div>
    </form>
  );
}
