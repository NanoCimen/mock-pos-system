/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POS_API_URL: string;
  readonly VITE_POS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
