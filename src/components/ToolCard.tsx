import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PDFTool } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: PDFTool;
  index: number;
}

const colorClasses = {
  coral: "bg-tool-coral/10 text-tool-coral group-hover:bg-tool-coral/20",
  green: "bg-tool-green/10 text-tool-green group-hover:bg-tool-green/20",
  blue: "bg-tool-blue/10 text-tool-blue group-hover:bg-tool-blue/20",
  yellow: "bg-tool-yellow/10 text-tool-yellow group-hover:bg-tool-yellow/20",
  purple: "bg-tool-purple/10 text-tool-purple group-hover:bg-tool-purple/20",
  orange: "bg-tool-orange/10 text-tool-orange group-hover:bg-tool-orange/20",
  teal: "bg-tool-teal/10 text-tool-teal group-hover:bg-tool-teal/20",
  pink: "bg-tool-pink/10 text-tool-pink group-hover:bg-tool-pink/20",
};

const ToolCard = ({ tool, index }: ToolCardProps) => {
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
    >
      <Link to={tool.route} className="group block h-full">
        <div className="relative h-full rounded-2xl border border-border/50 bg-card p-6 shadow-card transition-all duration-300 hover:border-border hover:shadow-card-hover hover:-translate-y-1">
          {/* New Badge */}
          {tool.isNew && (
            <Badge className="absolute right-4 top-4 bg-tool-green text-white">
              New!
            </Badge>
          )}

          {/* Icon */}
          <div
            className={cn(
              "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
              colorClasses[tool.color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default ToolCard;
