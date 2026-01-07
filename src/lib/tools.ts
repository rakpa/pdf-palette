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

export interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: "coral" | "green" | "blue" | "yellow" | "purple" | "orange" | "teal" | "pink";
  category: ToolCategory[];
  isNew?: boolean;
  route: string;
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
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Separate one PDF into multiple documents",
    icon: Scissors,
    color: "purple",
    category: ["organize"],
    route: "/split-pdf",
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    description: "Rotate PDF pages to the correct orientation",
    icon: RotateCw,
    color: "blue",
    category: ["organize"],
    route: "/rotate-pdf",
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
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert Excel spreadsheets to PDF",
    icon: FileSpreadsheet,
    color: "green",
    category: ["convert-to"],
    route: "/excel-to-pdf",
  },
  {
    id: "ppt-to-pdf",
    name: "PowerPoint to PDF",
    description: "Convert presentations to PDF format",
    icon: Presentation,
    color: "orange",
    category: ["convert-to"],
    route: "/powerpoint-to-pdf",
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF documents",
    icon: Image,
    color: "yellow",
    category: ["convert-to"],
    route: "/jpg-to-pdf",
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
  },
  {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract tables from PDF to Excel",
    icon: FileSpreadsheet,
    color: "green",
    category: ["convert-from"],
    route: "/pdf-to-excel",
  },
  {
    id: "pdf-to-ppt",
    name: "PDF to PowerPoint",
    description: "Convert PDF to editable presentations",
    icon: Presentation,
    color: "orange",
    category: ["convert-from"],
    route: "/pdf-to-powerpoint",
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Convert PDF pages to high-quality images",
    icon: Image,
    color: "yellow",
    category: ["convert-from"],
    route: "/pdf-to-jpg",
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
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Add text or image watermark to PDF",
    icon: Droplets,
    color: "teal",
    category: ["edit"],
    route: "/watermark-pdf",
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
  },
  {
    id: "protect",
    name: "Protect PDF",
    description: "Add password protection to your PDF",
    icon: Lock,
    color: "coral",
    category: ["security"],
    route: "/protect-pdf",
  },
  {
    id: "unlock",
    name: "Unlock PDF",
    description: "Remove password protection from PDF",
    icon: Unlock,
    color: "pink",
    category: ["security"],
    route: "/unlock-pdf",
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
