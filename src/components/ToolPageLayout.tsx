import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { PDFTool } from "@/lib/tools";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { cn } from "@/lib/utils";

interface ToolPageLayoutProps {
  tool: PDFTool;
  children: ReactNode;
}

const colorClasses = {
  coral: "bg-tool-coral/10 text-tool-coral",
  green: "bg-tool-green/10 text-tool-green",
  blue: "bg-tool-blue/10 text-tool-blue",
  yellow: "bg-tool-yellow/10 text-tool-yellow",
  purple: "bg-tool-purple/10 text-tool-purple",
  orange: "bg-tool-orange/10 text-tool-orange",
  teal: "bg-tool-teal/10 text-tool-teal",
  pink: "bg-tool-pink/10 text-tool-pink",
};

const ToolPageLayout = ({ tool, children }: ToolPageLayoutProps) => {
  const Icon = tool.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border bg-gradient-to-br from-background to-muted/30 py-8 md:py-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{tool.name}</span>
            </motion.nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  colorClasses[tool.color]
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                  {tool.name}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {children}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ToolPageLayout;
