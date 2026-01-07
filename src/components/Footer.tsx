import { Link } from "react-router-dom";
import { FileText, Github, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">PDFTools</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Free online PDF tools for everyone. All processing happens in your
              browser - your files never leave your device.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Popular Tools</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/merge-pdf" className="hover:text-foreground transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link to="/split-pdf" className="hover:text-foreground transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link to="/compress-pdf" className="hover:text-foreground transition-colors">
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link to="/pdf-to-word" className="hover:text-foreground transition-colors">
                  PDF to Word
                </Link>
              </li>
            </ul>
          </div>

          {/* Convert */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Convert</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/pdf-to-jpg" className="hover:text-foreground transition-colors">
                  PDF to JPG
                </Link>
              </li>
              <li>
                <Link to="/jpg-to-pdf" className="hover:text-foreground transition-colors">
                  JPG to PDF
                </Link>
              </li>
              <li>
                <Link to="/pdf-to-excel" className="hover:text-foreground transition-colors">
                  PDF to Excel
                </Link>
              </li>
              <li>
                <Link to="/word-to-pdf" className="hover:text-foreground transition-colors">
                  Word to PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PDFTools. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
