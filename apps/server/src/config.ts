import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export const PORT = 5174;

export const CACHE_DIR = join(homedir(), '.cache', 'cut-video');
export const MODEL_DIR = join(CACHE_DIR, 'models');
export const WORK_DIR = join(CACHE_DIR, 'work');

export const WHISPER_MODEL = join(MODEL_DIR, 'ggml-medium.bin');

/** whisper-cpp 在不同 Homebrew 版本下可执行文件名不同 */
export function resolveWhisperBin(): string {
  const candidates = ['whisper-cli', 'whisper-cpp', 'main'];
  for (const c of candidates) {
    if (existsSync(`/opt/homebrew/bin/${c}`)) return `/opt/homebrew/bin/${c}`;
    if (existsSync(`/usr/local/bin/${c}`)) return `/usr/local/bin/${c}`;
  }
  return 'whisper-cli';
}
