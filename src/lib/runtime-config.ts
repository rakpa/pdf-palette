function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Returns the base URL/prefix for the conversion microservice.
 *
 * In development: Vite proxy handles /api/* → localhost:3001
 * In production (Vercel): MUST be set via VITE_CONVERSION_PREFIX env var
 *   to the FULL public base URL of your separately deployed conversion service
 *   (the one built from services/word-to-pdf/ + Dockerfile).
 *
 * Example: https://pdf-palette-converter.onrender.com
 * Do NOT include a trailing slash.
 *
 * If not set correctly in prod you will get confusing network/405 errors.
 */
export function getConversionServicePrefix(): string {
  const raw =
    (import.meta as any).env?.VITE_CONVERSION_PREFIX ??
    (import.meta.env.PROD ? "" : "/_/word-to-pdf"); // force explicit config in prod

  if (import.meta.env.PROD && !raw) {
    throw new Error(
      "Conversion service not configured for production. " +
        "Set the VITE_CONVERSION_PREFIX environment variable on Vercel " +
        "to the full public URL of your deployed word-to-pdf service " +
        "(e.g. https://your-converter.onrender.com). See SETUP.md for instructions."
    );
  }

  return trimSlash(raw);
}

export function conversionServiceUrl(devPath: string, prodPath: string): string {
  const cleanDev = devPath.startsWith("/") ? devPath : `/${devPath}`;
  const cleanProd = prodPath.startsWith("/") ? prodPath : `/${prodPath}`;
  if (!import.meta.env.PROD) return cleanDev;

  const prefix = getConversionServicePrefix();
  // If prefix is a full URL (recommended for prod), this produces https://.../v1/...
  return `${prefix}${cleanProd}`;
}

