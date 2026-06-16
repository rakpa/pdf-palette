import { Link } from "react-router-dom";
import { PDFTool } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: PDFTool;
}

const colorClasses = {
  coral: "bg-tool-coral/10 text-tool-coral group-hover:bg-tool-coral/15",
  green: "bg-tool-green/10 text-tool-green group-hover:bg-tool-green/15",
  blue: "bg-tool-blue/10 text-tool-blue group-hover:bg-tool-blue/15",
  yellow: "bg-tool-yellow/10 text-tool-yellow group-hover:bg-tool-yellow/15",
  purple: "bg-tool-purple/10 text-tool-purple group-hover:bg-tool-purple/15",
  orange: "bg-tool-orange/10 text-tool-orange group-hover:bg-tool-orange/15",
  teal: "bg-tool-teal/10 text-tool-teal group-hover:bg-tool-teal/15",
  pink: "bg-tool-pink/10 text-tool-pink group-hover:bg-tool-pink/15",
};

const borderAccentClasses = {
  coral:
    "ring-1 ring-tool-coral/15 hover:ring-tool-coral/30",
  green:
    "ring-1 ring-tool-green/15 hover:ring-tool-green/30",
  blue:
    "ring-1 ring-tool-blue/15 hover:ring-tool-blue/30",
  yellow:
    "ring-1 ring-tool-yellow/15 hover:ring-tool-yellow/30",
  purple:
    "ring-1 ring-tool-purple/15 hover:ring-tool-purple/30",
  orange:
    "ring-1 ring-tool-orange/15 hover:ring-tool-orange/30",
  teal:
    "ring-1 ring-tool-teal/15 hover:ring-tool-teal/30",
  pink:
    "ring-1 ring-tool-pink/15 hover:ring-tool-pink/30",
};

const ToolCard = ({ tool }: ToolCardProps) => {
  const Icon = tool.comingSoon ? tool.comingSoonIcon ?? tool.icon : tool.icon;

  const Card = (
    <article
      className={cn(
        "relative flex h-full min-h-[11rem] flex-col rounded-2xl bg-card p-5 shadow-card transition-all duration-300 sm:min-h-[12rem] sm:p-6",
        // Accent ring per tool color (keep for all cards)
        borderAccentClasses[tool.color],
        tool.popular && "ring-2 ring-primary/25",
        "hover:-translate-y-1 hover:shadow-card-hover"
      )}
    >
      {tool.comingSoon ? null : null}
        <div className="absolute right-3 top-3 flex gap-1.5 sm:right-4 sm:top-4">
          {tool.comingSoon ? (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[11px] font-medium text-muted-foreground"
            >
              Soon
            </Badge>
          ) : (
            tool.popular && (
              <Badge className="h-5 bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/10">
                Popular
              </Badge>
            )
          )}
          {!tool.comingSoon && tool.isNew && !tool.popular && (
            <Badge className="h-5 bg-tool-green px-2 text-[11px] text-white hover:bg-tool-green/90">
              New
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "mb-4 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors sm:h-16 sm:w-16",
            tool.comingSoon ? "bg-muted text-muted-foreground" : colorClasses[tool.color]
          )}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        </div>

        <h3
          className={cn(
            "mb-1.5 pr-16 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg",
            tool.comingSoon ? "text-muted-foreground" : null
          )}
        >
          {tool.name}
        </h3>
        <p
          className={cn(
            "line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]",
            tool.comingSoon ? "opacity-80" : null
          )}
        >
          {tool.description}
        </p>
      </article>
  );

  return (
    <Link to={tool.route} className="group block h-full">
      {Card}
    </Link>
  );
};

export default ToolCard;
