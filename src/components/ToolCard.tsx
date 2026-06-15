import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
      transition={{ delay: index * 0.04, duration: 0.3 }}
      layout
    >
      <Link to={tool.route} className="group block h-full">
        <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover">
          {/* Hover gradient sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Badges */}
          <div className="absolute right-4 top-4 flex gap-2">
            {tool.comingSoon ? (
              <Badge variant="secondary" className="font-medium text-muted-foreground">
                Soon
              </Badge>
            ) : (
              tool.isNew && (
                <Badge className="bg-tool-green text-white hover:bg-tool-green/90">
                  New!
                </Badge>
              )
            )}
          </div>

          {/* Icon */}
          <div
            className={cn(
              "relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
              colorClasses[tool.color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <h3 className="relative mb-2 flex items-center gap-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {tool.name}
            <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </h3>
          <p className="relative text-sm leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default ToolCard;
