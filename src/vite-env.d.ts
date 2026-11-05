interface ImportMetaEnv {
  readonly VITE_NET_URL?: string;
  readonly VITE_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
