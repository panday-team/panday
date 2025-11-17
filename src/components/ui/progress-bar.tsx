import { memo } from "react";
import { motion } from "motion/react";

export interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
  className?: string;
}

/**
 * Get progress bar color based on percentage thresholds
 * - 0-33%: Red
 * - 33-66%: Yellow
 * - 67-100%: Green
 */
function getProgressColor(percentage: number): string {
  if (percentage < 33) {
    return "bg-gradient-to-r from-red-500 to-red-600";
  } else if (percentage < 67) {
    return "bg-gradient-to-r from-yellow-500 to-yellow-600";
  } else {
    return "bg-gradient-to-r from-green-500 to-green-600";
  }
}

/**
 * Progress bar component for tracking node completion
 * Shows visual progress bar with completion stats
 */
function ProgressBarComponent({
  completed,
  total,
  percentage,
  className = "",
}: ProgressBarProps) {
  const colorClass = getProgressColor(percentage);

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
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {/* Progress bar fill */}
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        />
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = "ProgressBar";
