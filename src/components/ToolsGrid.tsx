import { useMemo, useState } from "react";
import { Search, FileQuestion } from "lucide-react";
import { getToolsByCategory, ToolCategory } from "@/lib/tools";
import { Input } from "@/components/ui/input";
import CategoryFilter from "./CategoryFilter";
import ToolCard from "./ToolCard";

const ToolsGrid = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [query, setQuery] = useState("");

  const tools = useMemo(() => {
    const byCategory = getToolsByCategory(activeCategory);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
    );
  }, [activeCategory, query]);

  return (
    <section id="tools" className="scroll-mt-16 bg-card pb-10 pt-4 md:pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search tools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 bg-background pl-10"
              aria-label="Search PDF tools"
            />
          </div>
          <div className="min-w-0 flex-1 lg:pl-4">
            <CategoryFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>
        </div>

        {tools.length > 0 ? (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5"
            role="list"
          >
            {tools.map((tool) => (
              <div key={tool.id} role="listitem">
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <FileQuestion className="h-10 w-10" aria-hidden />
            <p>
              No tools match{" "}
              <span className="font-medium text-foreground">“{query}”</span>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ToolsGrid;
