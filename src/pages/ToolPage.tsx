import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  Loader2,
  Sparkles,
  RotateCw,
  ShieldCheck,
  Wand2,
} from "lucide-react";

import { getToolByRoute, ToolFeature } from "@/lib/tools";
import {
  CompressionLevel,
  ProcessingResult,
  addWatermark,
  compressPDF,
  downloadResult,
  getPDFInfo,
  imagesToPDF,
  mergePDFs,
  rotatePDF,
  splitPDF,
} from "@/lib/pdf-utils";
import ToolPageLayout from "@/components/ToolPageLayout";
import FileUploader, { UploadedFile } from "@/components/FileUploader";
import ProgressBar from "@/components/ProgressBar";
import NotFound from "./NotFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Per-feature upload constraints. */
const featureConfig: Record<
  ToolFeature,
  {
    accept: Record<string, string[]>;
    maxFiles: number;
    minFiles: number;
    cta: string;
    hint: string;
  }
> = {
  merge: {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 20,
    minFiles: 2,
    cta: "Merge PDFs",
    hint: "Add two or more PDFs. They’ll be combined in the order shown.",
  },
  split: {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    minFiles: 1,
    cta: "Split PDF",
    hint: "Choose page ranges to extract, e.g. 1-3, 5, 8-10.",
  },
  rotate: {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    minFiles: 1,
    cta: "Rotate PDF",
    hint: "Pick how far to turn every page.",
  },
  compress: {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    minFiles: 1,
    cta: "Compress PDF",
    hint: "Shrink your PDF with iLovePDF — uploads go directly to their servers, same as ilovepdf.com.",
  },
  watermark: {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    minFiles: 1,
    cta: "Add Watermark",
    hint: "Stamp custom text diagonally across every page.",
  },
  "jpg-to-pdf": {
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxFiles: 30,
    minFiles: 1,
    cta: "Create PDF",
    hint: "Add JPG or PNG images — one image per page, in order.",
  },
};

/** Parse "1-3, 5, 8-10" into page ranges. */
function parseRanges(input: string): { start: number; end: number }[] {
  return input
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [a, b] = chunk.split("-").map((n) => parseInt(n.trim(), 10));
      const start = a;
      const end = Number.isNaN(b) ? a : b;
      return { start, end };
    })
    .filter((r) => !Number.isNaN(r.start) && r.start > 0 && r.end >= r.start);
}

const ToolPage = () => {
  const { toolRoute } = useParams();
  const tool = getToolByRoute(`/${toolRoute}`);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  // Tool-specific options
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [ranges, setRanges] = useState("");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [compressionLevel, setCompressionLevel] =
    useState<CompressionLevel>("recommended");

  const config = useMemo(
    () => (tool?.feature ? featureConfig[tool.feature] : undefined),
    [tool]
  );

  if (!tool) return <NotFound />;

  const canProcess =
    !!config && files.length >= config.minFiles && !isProcessing;

  const reset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
  };

  const handleProcess = async () => {
    if (!tool.feature || !config) return;
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    const onProgress = (p: number) => setProgress(p);
    const inputFiles = files.map((f) => f.file);

    try {
      let res: ProcessingResult;

      switch (tool.feature) {
        case "merge":
          res = await mergePDFs(inputFiles, onProgress);
          break;
        case "rotate":
          res = await rotatePDF(inputFiles[0], rotation, undefined, onProgress);
          break;
        case "compress":
          res = await compressPDF(inputFiles[0], compressionLevel, onProgress);
          break;
        case "watermark":
          res = await addWatermark(
            inputFiles[0],
            watermarkText || "CONFIDENTIAL",
            { opacity },
            onProgress
          );
          break;
        case "jpg-to-pdf":
          res = await imagesToPDF(inputFiles, onProgress);
          break;
        case "split": {
          const parsed = parseRanges(ranges);
          if (ranges.trim() && parsed.length === 0) {
            res = {
              success: false,
              message: "Couldn’t read those page ranges. Try something like 1-3, 5, 8-10.",
            };
            break;
          }
          // No ranges given → extract every page individually.
          const results = parsed.length
            ? await splitPDF(inputFiles[0], parsed, onProgress)
            : await splitEveryPage(inputFiles[0], onProgress);

          const ok = results.filter((r) => r.success);
          ok.forEach((r) => downloadResult(r));
          if (ok.length === 0) {
            res = { success: false, message: results[0]?.message ?? "Nothing to extract." };
          } else {
            res = {
              success: true,
              message: `Extracted ${ok.length} file${ok.length === 1 ? "" : "s"} — downloads started.`,
            };
          }
          break;
        }
        default:
          res = { success: false, message: "This tool isn’t available yet." };
      }

      setResult(res);
      if (res.success) {
        toast.success(res.message);
        if (res.blob) downloadResult(res); // single-file tools auto-download
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setProgress(100);
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-2xl">
        {tool.comingSoon || !config ? (
          <ComingSoon />
        ) : (
          <div className="space-y-6">
            <FileUploader
              accept={config.accept}
              maxFiles={config.maxFiles}
              files={files}
              onFilesChange={(f) => {
                setFiles(f);
                setResult(null);
              }}
            />

            <p className="text-sm text-muted-foreground">{config.hint}</p>

            {/* Tool-specific options */}
            {files.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                {tool.feature === "rotate" && (
                  <RotateOptions value={rotation} onChange={setRotation} />
                )}
                {tool.feature === "split" && (
                  <div className="space-y-2">
                    <Label htmlFor="ranges">Page ranges</Label>
                    <Input
                      id="ranges"
                      placeholder="e.g. 1-3, 5, 8-10 (leave empty to split every page)"
                      value={ranges}
                      onChange={(e) => setRanges(e.target.value)}
                    />
                  </div>
                )}
                {tool.feature === "watermark" && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="wm">Watermark text</Label>
                      <Input
                        id="wm"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="CONFIDENTIAL"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Opacity</Label>
                        <span className="text-muted-foreground">
                          {Math.round(opacity * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[opacity]}
                        onValueChange={([v]) => setOpacity(v)}
                        min={0.05}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>
                )}
                {tool.feature === "compress" && (
                  <CompressOptions
                    value={compressionLevel}
                    onChange={setCompressionLevel}
                  />
                )}
                {(tool.feature === "merge" || tool.feature === "jpg-to-pdf") && (
                  <p className="text-sm text-muted-foreground">
                    Ready when you are — hit <span className="font-medium text-foreground">{config.cta}</span> below.
                  </p>
                )}
              </div>
            )}

            {/* Progress */}
            {isProcessing && <ProgressBar progress={progress} />}

            {/* Result banner */}
            {result?.success && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl border border-tool-green/30 bg-tool-green/10 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-tool-green" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Done!</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
                {result.blob && (
                  <Button size="sm" variant="outline" onClick={() => downloadResult(result)}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                )}
              </motion.div>
            )}

            {/* Action */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="gap-2"
                disabled={!canProcess}
                onClick={handleProcess}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    {config.cta}
                  </>
                )}
              </Button>
              {(files.length > 0 || result) && !isProcessing && (
                <Button size="lg" variant="ghost" onClick={reset}>
                  Start over
                </Button>
              )}
            </div>

            <PrivacyNote localOnly={tool.feature !== "compress"} />
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

/** Build per-page ranges from a single document. */
async function splitEveryPage(
  file: File,
  onProgress?: (p: number) => void
): Promise<ProcessingResult[]> {
  const { pageCount } = await getPDFInfo(file);
  const ranges = Array.from({ length: pageCount }, (_, i) => ({
    start: i + 1,
    end: i + 1,
  }));
  return splitPDF(file, ranges, onProgress);
}

const RotateOptions = ({
  value,
  onChange,
}: {
  value: 90 | 180 | 270;
  onChange: (v: 90 | 180 | 270) => void;
}) => (
  <div className="space-y-3">
    <Label>Rotation</Label>
    <div className="flex flex-wrap gap-2">
      {([90, 180, 270] as const).map((deg) => (
        <button
          key={deg}
          onClick={() => onChange(deg)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
            value === deg
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <RotateCw className="h-4 w-4" style={{ transform: `rotate(${deg}deg)` }} />
          {deg}°
        </button>
      ))}
    </div>
  </div>
);

const CompressOptions = ({
  value,
  onChange,
}: {
  value: CompressionLevel;
  onChange: (v: CompressionLevel) => void;
}) => {
  const options: { id: CompressionLevel; label: string; desc: string }[] = [
    { id: "low", label: "Low", desc: "Best quality" },
    { id: "recommended", label: "Recommended", desc: "Best balance" },
    { id: "extreme", label: "Extreme", desc: "Smallest file" },
  ];
  return (
    <div className="space-y-3">
      <Label>Compression level</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-center transition-all",
              value === o.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "text-sm font-medium",
                value === o.id ? "text-primary" : "text-foreground"
              )}
            >
              {o.label}
            </div>
            <div className="text-xs text-muted-foreground">{o.desc}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Uses iLovePDF&apos;s compression engine (same as ilovepdf.com). Recommended
        gives the best size-to-quality ratio. Extreme shrinks the most but may
        reduce image quality on scanned PDFs.
      </p>
    </div>
  );
};

const PrivacyNote = ({ localOnly = true }: { localOnly?: boolean }) => (
  <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
    <ShieldCheck className="h-4 w-4 text-tool-green" />
    {localOnly
      ? "Your files are processed locally and never uploaded to a server."
      : "Your file uploads directly to iLovePDF for compression (same as ilovepdf.com) and is deleted after processing."}
  </div>
);

const ComingSoon = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center"
  >
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Sparkles className="h-7 w-7" />
    </div>
    <h3 className="text-xl font-semibold text-foreground">Coming soon</h3>
    <p className="mx-auto mt-2 max-w-md text-muted-foreground">
      This tool needs secure server-side processing that we’re still building.
      In the meantime, explore the tools that already run fully in your browser.
    </p>
    <Button asChild className="mt-6">
      <a href="/#tools">Browse available tools</a>
    </Button>
  </motion.div>
);

export default ToolPage;
