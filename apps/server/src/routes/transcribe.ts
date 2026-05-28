import type { FastifyInstance } from 'fastify';
import { mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { WORK_DIR } from '../config.js';
import { extractAudioForWhisper } from '../lib/ffmpeg.js';
import { transcribe } from '../lib/whisper.js';
import { newJobId, publish } from '../lib/progress.js';

export default async function transcribeRoute(app: FastifyInstance) {
  app.post<{ Body: { path: string; language?: string } }>('/transcribe', async (req, reply) => {
    const { path, language } = req.body;
    if (!path) return reply.code(400).send({ error: 'path 必填' });

    const jobId = newJobId();
    // 立即返回 jobId,前端订阅 SSE 看进度
    reply.send({ ok: true, jobId });

    (async () => {
      try {
        await mkdir(WORK_DIR, { recursive: true });
        const id = basename(path).replace(/\.[^.]+$/, '') + '_' + Date.now();
        const wavPath = join(WORK_DIR, `${id}.wav`);
        const outBase = join(WORK_DIR, `${id}`);

        await extractAudioForWhisper(path, wavPath, jobId);
        const cues = await transcribe({ wavPath, outputBase: outBase, language, jobId });
        publish({
          jobId,
          stage: 'done',
          progress: 1,
          message: '转写完成',
          data: { cues, srtPath: `${outBase}.srt`, wavPath },
        });
      } catch (e: any) {
        publish({ jobId, stage: 'error', message: e.message ?? String(e) });
      }
    })();
  });
}
