import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    <section id="tools" className="scroll-mt-20 py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground">All PDF Tools</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Choose from our collection of powerful PDF tools to handle any task
          </p>
        </motion.div>

        {/* Search */}
        <div className="mx-auto mb-8 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-10">
          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Tools Grid */}
        {tools.length > 0 ? (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {tools.map((tool, index) => (
                <ToolCard key={tool.id} tool={tool} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <FileQuestion className="h-10 w-10" />
            <p>
              No tools match <span className="font-medium text-foreground">“{query}”</span>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ToolsGrid;
