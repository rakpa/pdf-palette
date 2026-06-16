import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
}

const ProgressBar = ({
  progress,
  className,
  showLabel = true,
  label = "Processing...",
  indeterminate = false,
}: ProgressBarProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          {!indeterminate && (
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        {indeterminate ? (
          <motion.div
            className="h-full w-1/3 bg-primary"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
