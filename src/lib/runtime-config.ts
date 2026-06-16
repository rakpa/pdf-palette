function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getConversionServicePrefix(): string {
  // Vercel experimental service route prefix (prod). In dev, Vite proxy handles /api/*.
  const prefix =
    (import.meta as any).env?.VITE_CONVERSION_PREFIX ??
    "/_/word-to-pdf";
  return trimSlash(prefix);
}

export function conversionServiceUrl(devPath: string, prodPath: string): string {
  const cleanDev = devPath.startsWith("/") ? devPath : `/${devPath}`;
  const cleanProd = prodPath.startsWith("/") ? prodPath : `/${prodPath}`;
  if (!import.meta.env.PROD) return cleanDev;
  return `${getConversionServicePrefix()}${cleanProd}`;
}

