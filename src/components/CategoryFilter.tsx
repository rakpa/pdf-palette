import { motion } from "framer-motion";
import { categories, ToolCategory } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  activeCategory: ToolCategory;
  onCategoryChange: (category: ToolCategory) => void;
}

const CategoryFilter = ({ activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-4">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id as ToolCategory)}
          className={cn(
            "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
            activeCategory === category.id
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {activeCategory === category.id && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
