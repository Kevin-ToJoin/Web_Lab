// Types for the format-check script. It stays plain ESM because CI runs it with
// bare `node` before anything is built, so the declarations live beside it.
export declare function resolveBase(opts?: {
  env?: Record<string, string | undefined>;
  argBase?: string;
  exists?: (ref: string) => boolean;
}): string;

export declare function formattable(
  paths: string[],
  opts?: { exists?: (path: string) => boolean },
): string[];
