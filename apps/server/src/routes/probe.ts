import type { FastifyInstance } from 'fastify';
import { ffprobe } from '../lib/ffmpeg.js';

export default async function probeRoute(app: FastifyInstance) {
  app.post<{ Body: { path: string } }>('/probe', async (req, reply) => {
    const { path } = req.body;
    if (!path) return reply.code(400).send({ error: 'path 必填' });
    try {
      const info = await ffprobe(path);
      return { ok: true, info };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, error: e.message ?? String(e) });
    }
  });
}
