import { memo } from "react";
import { motion } from "motion/react";

export interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
  className?: string;
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
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600"
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
