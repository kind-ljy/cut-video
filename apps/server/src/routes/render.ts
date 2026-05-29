import type { FastifyInstance } from 'fastify';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { WORK_DIR } from '../config.js';
import { renderVideo, type WatermarkRegion } from '../lib/ffmpeg.js';
import { cuesToSrt, type SubtitleCue } from '../lib/whisper.js';
import { newJobId, publish } from '../lib/progress.js';

interface RenderBody {
  input: string;
  output: string;
  segments: [number, number][];
  cues?: SubtitleCue[];   // 字幕(已按 segments 调整,或原始)。原始可由前端调整后传过来
  burnSubtitle?: boolean;
  bgmPath?: string | null;
  bgmVolume?: number;
  keepOriginalAudio?: boolean;
  /**
   * 当 cues 是相对原始视频的时间戳时,需要按 segments 重新对齐到剪辑后视频
   */
  remapSubtitles?: boolean;
  /** 要去除的水印区域(像素坐标,基于源视频) */
  watermarks?: WatermarkRegion[];
}

export default async function renderRoute(app: FastifyInstance) {
  app.post<{ Body: RenderBody }>('/render', async (req, reply) => {
    const body = req.body;
    if (!body.input || !body.output || !body.segments?.length) {
      return reply.code(400).send({ error: 'input/output/segments 必填' });
    }

    const jobId = newJobId();
    reply.send({ ok: true, jobId });

    (async () => {
      try {
        await mkdir(WORK_DIR, { recursive: true });
        let subtitlePath: string | null = null;
        if (body.cues && body.cues.length > 0) {
          // 把字幕重映射到剪辑后的时间轴
          const remapped = body.remapSubtitles !== false
            ? remapCues(body.cues, body.segments)
            : body.cues;
          const srt = cuesToSrt(remapped);
          subtitlePath = join(WORK_DIR, `${basename(body.input).replace(/\.[^.]+$/, '')}_${Date.now()}.srt`);
          await writeFile(subtitlePath, srt, 'utf-8');
        }

        await renderVideo({
          input: body.input,
          output: body.output,
          segments: body.segments,
          subtitlePath,
          burnSubtitle: body.burnSubtitle ?? true,
          bgmPath: body.bgmPath ?? null,
          bgmVolume: body.bgmVolume ?? 0.3,
          keepOriginalAudio: body.keepOriginalAudio ?? true,
          watermarks: body.watermarks ?? [],
          jobId,
        });
      } catch (e: any) {
        publish({ jobId, stage: 'error', message: e.message ?? String(e) });
      }
    })();
  });
}

/**
 * 把绝对时间字幕 cues 重映射到 segments 拼接后的时间轴
 */
function remapCues(cues: SubtitleCue[], segments: [number, number][]): SubtitleCue[] {
  const out: SubtitleCue[] = [];
  let cumulative = 0;
  for (const [s, e] of segments) {
    for (const cue of cues) {
      const cs = Math.max(cue.start, s);
      const ce = Math.min(cue.end, e);
      if (ce > cs) {
        out.push({
          start: cumulative + (cs - s),
          end: cumulative + (ce - s),
          text: cue.text,
        });
      }
    }
    cumulative += e - s;
  }
  return out;
}
