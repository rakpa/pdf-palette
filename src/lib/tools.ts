import { 
  FileStack, 
  Scissors, 
  RotateCw, 
  Minimize2, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  Code, 
  Edit3, 
  Droplets, 
  PenTool, 
  Lock, 
  Unlock,
  LucideIcon
} from "lucide-react";

export type ToolCategory = "all" | "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security";

/**
 * Client-side capabilities that are actually implemented with pdf-lib.
 * Tools without a `feature` are showcased but flagged `comingSoon`, since they
 * require server-side processing (e.g. OCR, Office conversions, encryption).
 */
export type ToolFeature =
  | "merge"
  | "split"
  | "rotate"
  | "compress"
  | "watermark"
  | "jpg-to-pdf";

export interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: "coral" | "green" | "blue" | "yellow" | "purple" | "orange" | "teal" | "pink";
  category: ToolCategory[];
  isNew?: boolean;
  route: string;
  /** Maps the tool to a working pdf-lib engine. Omit for not-yet-available tools. */
  feature?: ToolFeature;
  /** True when the tool is showcased but not functional in the browser yet. */
  comingSoon?: boolean;
}

export const pdfTools: PDFTool[] = [
  // Organize PDF
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDF files into one document",
    icon: FileStack,
    color: "coral",
    category: ["organize"],
    route: "/merge-pdf",
    feature: "merge",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Separate one PDF into multiple documents",
    icon: Scissors,
    color: "purple",
    category: ["organize"],
    route: "/split-pdf",
    feature: "split",
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    description: "Rotate PDF pages to the correct orientation",
    icon: RotateCw,
    color: "blue",
    category: ["organize"],
    route: "/rotate-pdf",
    feature: "rotate",
  },

  // Optimize PDF
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce file size while maintaining quality",
    icon: Minimize2,
    color: "green",
    category: ["optimize"],
    route: "/compress-pdf",
    feature: "compress",
  },

  // Convert to PDF
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: FileText,
    color: "blue",
    category: ["convert-to"],
    route: "/word-to-pdf",
    comingSoon: true,
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert Excel spreadsheets to PDF",
    icon: FileSpreadsheet,
    color: "green",
    category: ["convert-to"],
    route: "/excel-to-pdf",
    comingSoon: true,
  },
  {
    id: "ppt-to-pdf",
    name: "PowerPoint to PDF",
    description: "Convert presentations to PDF format",
    icon: Presentation,
    color: "orange",
    category: ["convert-to"],
    route: "/powerpoint-to-pdf",
    comingSoon: true,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF documents",
    icon: Image,
    color: "yellow",
    category: ["convert-to"],
    route: "/jpg-to-pdf",
    feature: "jpg-to-pdf",
  },
  {
    id: "html-to-pdf",
    name: "HTML to PDF",
    description: "Convert web pages to PDF format",
    icon: Code,
    color: "teal",
    category: ["convert-to"],
    isNew: true,
    route: "/html-to-pdf",
    comingSoon: true,
  },

  // Convert from PDF
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF files to editable Word documents",
    icon: FileText,
    color: "blue",
    category: ["convert-from"],
    route: "/pdf-to-word",
    comingSoon: true,
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract tables from PDF to Excel",
    icon: FileSpreadsheet,
    color: "green",
    category: ["convert-from"],
    route: "/pdf-to-excel",
    comingSoon: true,
  },
  {
    id: "pdf-to-ppt",
    name: "PDF to PowerPoint",
    description: "Convert PDF to editable presentations",
    icon: Presentation,
    color: "orange",
    category: ["convert-from"],
    route: "/pdf-to-powerpoint",
    comingSoon: true,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Convert PDF pages to high-quality images",
    icon: Image,
    color: "yellow",
    category: ["convert-from"],
    route: "/pdf-to-jpg",
    comingSoon: true,
  },

  // Edit PDF
  {
    id: "edit",
    name: "Edit PDF",
    description: "Add text, images, and annotations to PDF",
    icon: Edit3,
    color: "coral",
    category: ["edit"],
    route: "/edit-pdf",
    comingSoon: true,
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Add text or image watermark to PDF",
    icon: Droplets,
    color: "teal",
    category: ["edit"],
    route: "/watermark-pdf",
    feature: "watermark",
  },

  // Security
  {
    id: "sign",
    name: "Sign PDF",
    description: "Add your signature to PDF documents",
    icon: PenTool,
    color: "purple",
    category: ["security"],
    isNew: true,
    route: "/sign-pdf",
    comingSoon: true,
  },
  {
    id: "protect",
    name: "Protect PDF",
    description: "Add password protection to your PDF",
    icon: Lock,
    color: "coral",
    category: ["security"],
    route: "/protect-pdf",
    comingSoon: true,
  },
  {
    id: "unlock",
    name: "Unlock PDF",
    description: "Remove password protection from PDF",
    icon: Unlock,
    color: "pink",
    category: ["security"],
    route: "/unlock-pdf",
    comingSoon: true,
  },
];

export const categories = [
  { id: "all", label: "All Tools" },
  { id: "organize", label: "Organize PDF" },
  { id: "optimize", label: "Optimize PDF" },
  { id: "convert-to", label: "Convert to PDF" },
  { id: "convert-from", label: "Convert from PDF" },
  { id: "edit", label: "Edit PDF" },
  { id: "security", label: "Security" },
] as const;

export const getToolsByCategory = (category: ToolCategory): PDFTool[] => {
  if (category === "all") return pdfTools;
  return pdfTools.filter((tool) => tool.category.includes(category));
};

export const getToolById = (id: string): PDFTool | undefined => {
  return pdfTools.find((tool) => tool.id === id);
};

export const getToolByRoute = (route: string): PDFTool | undefined => {
  return pdfTools.find((tool) => tool.route === route);
};
