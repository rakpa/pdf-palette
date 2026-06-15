import { motion } from "framer-motion";
import { MousePointerClick, Settings2, Download } from "lucide-react";

const steps = [
  {
    icon: MousePointerClick,
    title: "Pick a tool",
    description: "Choose from merge, split, rotate, compress, watermark and more.",
  },
  {
    icon: Settings2,
    title: "Drop your files",
    description: "Drag & drop your PDFs or images and tweak any options you need.",
  },
  {
    icon: Download,
    title: "Download instantly",
    description: "Your processed file is ready to download in seconds — no waiting.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Three simple steps
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            From file to finished in under a minute.
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line on desktop */}
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <step.icon className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-card text-sm font-bold text-primary shadow-card">
                  {index + 1}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
