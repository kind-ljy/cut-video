/**
 * 抽取视频指定时间点的单帧 jpg,供前端框选水印用
 */
import type { FastifyInstance } from 'fastify';
import { mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { WORK_DIR } from '../config.js';
import { snapshotFrame } from '../lib/ffmpeg.js';

export default async function snapshotRoute(app: FastifyInstance) {
  app.get<{ Querystring: { path: string; t?: string } }>('/snapshot', async (req, reply) => {
    const { path, t = '0' } = req.query;
    if (!path) return reply.code(400).send({ error: 'path 必填' });
    const time = parseFloat(t) || 0;

    await mkdir(WORK_DIR, { recursive: true });
    // 缓存 key: 用 mtime + path + 时间点
    let mtime = 0;
    try { mtime = statSync(path).mtimeMs; } catch {}
    const key = createHash('md5')
      .update(`${path}|${mtime}|${time.toFixed(3)}`)
      .digest('hex')
      .slice(0, 12);
    const out = join(WORK_DIR, `snap_${basename(path).replace(/[^\w.-]/g, '_')}_${key}.jpg`);

    if (!existsSync(out)) {
      try {
        await snapshotFrame(path, time, out);
      } catch (e: any) {
        return reply.code(500).send({ error: e.message ?? String(e) });
      }
    }

    return reply.send({ ok: true, snapshotPath: out });
  });
}
