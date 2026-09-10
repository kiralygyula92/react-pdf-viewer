// Bundlers statically replace `process.env.NODE_ENV`; where nothing defines `process`, the access
// throws and we treat the environment as production.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

/** True unless the consumer's bundler marks the build as production. */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}
