/**
 * whisper.cpp 调用封装
 */
import { execa } from 'execa';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolveWhisperBin, WHISPER_MODEL } from '../config.js';
import { publish } from './progress.js';

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

/**
 * 输入 wav (16kHz mono),输出 SRT 文件路径 + 解析好的 cue 列表
 */
export async function transcribe(opts: {
  wavPath: string;
  outputBase: string;       // 不带后缀的输出基路径,whisper 会自动加 .srt
  language?: string;        // auto / zh / en
  jobId?: string;
}): Promise<SubtitleCue[]> {
  const { wavPath, outputBase, language = 'auto', jobId } = opts;
  if (!existsSync(WHISPER_MODEL)) {
    throw new Error(`Whisper 模型不存在: ${WHISPER_MODEL},请先运行 ./scripts/setup.sh`);
  }
  const bin = resolveWhisperBin();

  if (jobId) publish({ jobId, stage: 'transcribe', progress: 0, message: '语音转写中（这一步较慢，请耐心等待）...' });

  const args = [
    '-m', WHISPER_MODEL,
    '-f', wavPath,
    '-of', outputBase,
    '-osrt',                  // 输出 SRT
    '-l', language,
    '-t', String(Math.max(2, (await import('node:os')).cpus().length - 1)),
    '-pp',                    // print progress
  ];

  const child = execa(bin, args, { all: true });
  child.all?.on('data', (chunk) => {
    const txt = String(chunk);
    const m = txt.match(/progress\s*=\s*(\d+)%/);
    if (m && jobId) {
      publish({
        jobId,
        stage: 'transcribe',
        progress: parseInt(m[1], 10) / 100,
        message: `转写中 ${m[1]}%`,
      });
    }
  });
  await child;

  const srtPath = `${outputBase}.srt`;
  const srt = await readFile(srtPath, 'utf-8');
  return parseSrt(srt);
}

function parseSrt(srt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = srt.replace(/\r/g, '').split(/\n\n+/);
  for (const blk of blocks) {
    const lines = blk.trim().split('\n');
    if (lines.length < 2) continue;
    const timing = lines.find((l) => l.includes('-->'));
    if (!timing) continue;
    const [a, b] = timing.split('-->').map((s) => srtTimeToSec(s.trim()));
    const text = lines.slice(lines.indexOf(timing) + 1).join('\n').trim();
    if (text) cues.push({ start: a, end: b, text });
  }
  return cues;
}

function srtTimeToSec(t: string): number {
  // 00:00:01,234
  const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues.map((c, i) => {
    return `${i + 1}\n${secToSrt(c.start)} --> ${secToSrt(c.end)}\n${c.text}\n`;
  }).join('\n');
}

function secToSrt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(sec, 2)},${pad(ms, 3)}`;
}
function pad(n: number, w: number) { return String(n).padStart(w, '0'); }
