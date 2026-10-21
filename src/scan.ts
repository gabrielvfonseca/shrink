import type { Dirent, Stats } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Ignore } from "ignore";
import ignore from "ignore";
import type { SkipRecord } from "./types.js";

/** Patterns always excluded regardless of gitignore (noise an agent never needs). */
export const BUILTIN_IGNORES: string[] = [
  "node_modules/",
  ".git/",
  ".hg/",
  ".svn/",
  ".jj/",
  "dist/",
  "build/",
  "out/",
  ".next/",
  ".nuxt/",
  ".output/",
  ".turbo/",
  ".cache/",
  ".parcel-cache/",
  "coverage/",
  ".coverage/",
  "target/",
  "__pycache__/",
  "*.pyc",
  ".venv/",
  "venv/",
  ".mypy_cache/",
  ".pytest_cache/",
  ".ruff_cache/",
  ".tox/",
  ".gradle/",
  ".idea/",
  ".vscode/",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "poetry.lock",
  "composer.lock",
  "Gemfile.lock",
  "uv.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.ico",
  "*.svg",
  "*.pdf",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.bz2",
  "*.xz",
  "*.7z",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.otf",
  "*.eot",
  "*.mp4",
  "*.webm",
  "*.mov",
  "*.mp3",
  "*.wav",
  "*.ogg",
  "*.wasm",
  "*.exe",
  "*.dylib",
  "*.so",
  "*.dll",
  "*.bin",
  "*.dat",
  "*.db",
  "*.sqlite",
  "*.sqlite3",
  "*.pb.go",
  "*.pb.cc",
  "*.pb.h",
  "*_pb2.py",
  "*_pb2_grpc.py",
];

const IGNORE_FILES = [".gitignore", ".tokenignore", ".ignore"];

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export interface ScannedFile {
  absPath: string;
  relPath: string;
  size: number;
}

export interface ScanResult {
  files: ScannedFile[];
  skipped: SkipRecord[];
}

export interface ScanOptions {
  maxBytes?: number;
  useIgnoreFiles?: boolean;
}

interface IgnoreFrame {
  /** Directory (relative, posix) the rules apply to; "" for root */
  base: string;
  ig: Ignore;
}

function isBinary(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  return sample.includes(0);
}

async function readIgnoreFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function frameMatches(
  frame: IgnoreFrame,
  relPosix: string,
  isDir: boolean
): boolean {
  let target = relPosix;
  if (frame.base) {
    const prefix = `${frame.base}/`;
    if (!relPosix.startsWith(prefix)) {
      return false;
    }
    target = relPosix.slice(prefix.length);
  }
  if (!target) {
    return false;
  }
  const asDir = isDir ? `${target}/` : target;
  return frame.ig.ignores(asDir) || frame.ig.ignores(target);
}

async function safeStat(childAbs: string): Promise<Stats | null> {
  try {
    return await fs.stat(childAbs);
  } catch {
    return null;
  }
}

async function safeReadFile(childAbs: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(childAbs);
  } catch {
    return null;
  }
}

/**
 * Walks the directory tree, honoring .gitignore / .tokenignore / .ignore
 * (root and nested), a built-in noise denylist, binary detection, and a
 * max file size. Returns text files only.
 */
export async function scan(
  root: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const useIgnoreFiles = options.useIgnoreFiles !== false;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const absRoot = path.resolve(root);
  const files: ScannedFile[] = [];
  const skipped: SkipRecord[] = [];

  const builtin = ignore().add(BUILTIN_IGNORES);
  const frames: IgnoreFrame[] = [];

  if (useIgnoreFiles) {
    const contents = await Promise.all(
      IGNORE_FILES.map((name) => readIgnoreFile(path.join(absRoot, name)))
    );
    for (const content of contents) {
      if (content !== null) {
        frames.push({ base: "", ig: ignore().add(content) });
      }
    }
  }

  const matches = (relPosix: string, isDir: boolean): boolean =>
    builtin.ignores(relPosix) ||
    frames.some((frame) => frameMatches(frame, relPosix, isDir));

  const collectIgnoreFrames = async (
    dirAbs: string,
    relPosix: string
  ): Promise<void> => {
    if (!useIgnoreFiles || relPosix === "") {
      return;
    }
    const contents = await Promise.all(
      IGNORE_FILES.map((name) => readIgnoreFile(path.join(dirAbs, name)))
    );
    for (const content of contents) {
      if (content !== null) {
        frames.push({ base: relPosix, ig: ignore().add(content) });
      }
    }
  };

  const handleFile = async (
    childAbs: string,
    childRel: string
  ): Promise<void> => {
    if (matches(childRel, false)) {
      return;
    }

    const stat = await safeStat(childAbs);
    if (!stat) {
      return;
    }

    if (stat.size > maxBytes) {
      skipped.push({ reason: "too-large", relPath: childRel, size: stat.size });
      return;
    }
    if (stat.size === 0) {
      skipped.push({ reason: "empty", relPath: childRel, size: 0 });
      return;
    }

    const buf = await safeReadFile(childAbs);
    if (!buf) {
      skipped.push({ reason: "unreadable", relPath: childRel });
      return;
    }
    if (isBinary(buf)) {
      skipped.push({ reason: "binary", relPath: childRel, size: stat.size });
      return;
    }

    files.push({ absPath: childAbs, relPath: childRel, size: stat.size });
  };

  const handleEntry = async (
    entry: Dirent,
    dirAbs: string,
    relPosix: string
  ): Promise<void> => {
    const childAbs = path.join(dirAbs, entry.name);
    const childRel = relPosix ? `${relPosix}/${entry.name}` : entry.name;

    if (entry.isSymbolicLink()) {
      skipped.push({ reason: "symlink", relPath: childRel });
      return;
    }
    if (entry.isDirectory()) {
      if (!matches(childRel, true)) {
        await walk(childAbs, childRel);
      }
      return;
    }
    if (entry.isFile()) {
      await handleFile(childAbs, childRel);
    }
  };

  async function walk(dirAbs: string, relPosix: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    await collectIgnoreFrames(dirAbs, relPosix);
    await Promise.all(
      entries.map((entry) => handleEntry(entry, dirAbs, relPosix))
    );
  }

  await walk(absRoot, "");
  files.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { files, skipped };
}
