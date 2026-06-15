/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ILOVEPDF_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
