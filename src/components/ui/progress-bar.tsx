import { memo } from "react";
import { motion } from "motion/react";

export interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
  className?: string;
}

/**
 * Get progress bar gradient based on percentage thresholds
 * - 0-33%: Red
 * - 33-66%: Yellow
 * - 67-100%: Green
 */
function getProgressGradient(percentage: number): string {
  if (percentage < 33) {
    return "linear-gradient(to right, #ef4444, #dc2626)";
  } else if (percentage < 67) {
    return "linear-gradient(to right, #eab308, #ca8a04)";
  } else {
    return "linear-gradient(to right, #22c55e, #16a34a)";
  }
}

/**
 * Progress bar component for tracking node completion
 * Shows visual progress bar with completion stats
 * Animates with a "filling up" effect when progress changes
 */
function ProgressBarComponent({
  completed,
  total,
  percentage,
  className = "",
}: ProgressBarProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Progress text */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">
          {completed} of {total} completed
        </span>
        <span className="font-bold text-gray-900">{percentage}%</span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {/* Progress bar fill - animates by "filling up" from left */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: getProgressGradient(percentage),
          }}
          initial={false}
          animate={{
            width: `${percentage}%`,
          }}
          transition={{
            duration: 0.8,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = "ProgressBar";
