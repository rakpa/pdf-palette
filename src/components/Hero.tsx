import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-tool-blue/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            100% Free • No Registration Required
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            Every tool you need to work with{" "}
            <span className="text-primary">PDFs</span> in one place
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Merge, split, compress, convert, rotate, unlock and watermark PDFs
            with just a few clicks. All tools are 100% free and work entirely in
            your browser.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center"
          >
            <div>
              <div className="text-3xl font-bold text-foreground">18+</div>
              <div className="text-sm text-muted-foreground">PDF Tools</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-3xl font-bold text-foreground">100%</div>
              <div className="text-sm text-muted-foreground">Free Forever</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-3xl font-bold text-foreground">Private</div>
              <div className="text-sm text-muted-foreground">Files Stay Local</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
