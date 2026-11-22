/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<комп>.<tailnet>.ts.net — без /api на конце. */
  readonly VITE_API_URL?: string
}

/** Короткий хеш коммита сборки или «local». */
declare const __BUILD__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
