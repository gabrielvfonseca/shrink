import type { TiktokenBPE } from "js-tiktoken/lite";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";

let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = new Tiktoken(o200k as TiktokenBPE);
  }
  return encoder;
}

/**
 * Count tokens with the o200k_base BPE encoding (GPT-4o family).
 * Exact for OpenAI o200k models; a solid offline approximation for
 * Claude/Gemini/other model families (typically within ~10%).
 */
export function countTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return getEncoder().encode(text, [], []).length;
}
