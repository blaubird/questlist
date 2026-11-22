/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<комп>.<tailnet>.ts.net — без /api на конце. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
