import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ToolsGrid from "@/components/ToolsGrid";
import Footer from "@/components/Footer";
import { warmupGhostscript } from "@/lib/ghostscript-compress";

const Features = lazy(() => import("@/components/Features"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));

const BelowFoldFallback = () => (
  <div className="h-24 animate-pulse bg-muted/20" aria-hidden />
);

const Index = () => {
  // Preload compression engine on homepage so compress feels instant later.
  useEffect(() => {
    warmupGhostscript().catch(() => {
      // Best-effort; compress page retries if needed.
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ToolsGrid />
        <Suspense fallback={<BelowFoldFallback />}>
          <Features />
        </Suspense>
        <Suspense fallback={<BelowFoldFallback />}>
          <HowItWorks />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
