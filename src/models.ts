export interface ModelInfo {
  /** Context window in tokens; null = unknown / model-dependent */
  contextWindow: number | null;
  id: string;
  label: string;
}

export const MODELS: readonly ModelInfo[] = [
  { contextWindow: 1_000_000, id: "claude-opus-4.6", label: "Claude Opus 4.6" },
  {
    contextWindow: 1_000_000,
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
  },
  { contextWindow: 200_000, id: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { contextWindow: 400_000, id: "gpt-5.2", label: "GPT-5.2" },
  { contextWindow: 400_000, id: "gpt-5-mini", label: "GPT-5 mini" },
  { contextWindow: 400_000, id: "gpt-5-nano", label: "GPT-5 nano" },
  { contextWindow: 1_000_000, id: "gemini-3-pro", label: "Gemini 3 Pro" },
  { contextWindow: 1_000_000, id: "gemini-3-flash", label: "Gemini 3 Flash" },
  { contextWindow: 1_000_000, id: "llama-4", label: "Llama 4 (1M)" },
  { contextWindow: 256_000, id: "mistral-large-3", label: "Mistral Large 3" },
  { contextWindow: null, id: "custom", label: "Custom window" },
];

export function findModel(id: string): ModelInfo | undefined {
  const needle = id.toLowerCase();
  return MODELS.find(
    (m) => m.id === needle || m.label.toLowerCase() === needle
  );
}

/** Formats a token count with K/M suffix. */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return `${n}`;
}

/** Formats a byte count with KB/MB suffix. */
export function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) {
    return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  }
  if (n >= 1024) {
    return `${(n / 1024).toFixed(1)}KB`;
  }
  return `${n}B`;
}

/** Formats a percentage with one decimal. */
export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}
