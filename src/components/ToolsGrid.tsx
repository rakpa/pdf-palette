import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getToolsByCategory, ToolCategory } from "@/lib/tools";
import CategoryFilter from "./CategoryFilter";
import ToolCard from "./ToolCard";

const ToolsGrid = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const tools = getToolsByCategory(activeCategory);

  return (
    <section id="tools" className="py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            All PDF Tools
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Choose from our collection of powerful PDF tools to handle any task
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="mb-10">
          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Tools Grid */}
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
      </div>
    </section>
  );
};

export default ToolsGrid;
