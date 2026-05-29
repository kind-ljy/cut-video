import Fastify from 'fastify';
import cors from '@fastify/cors';
import { mkdir } from 'node:fs/promises';

import { PORT, WORK_DIR } from './config.js';
import { attachSSE } from './lib/progress.js';

import probeRoute from './routes/probe.js';
import transcribeRoute from './routes/transcribe.js';
import autocutRoute from './routes/autocut.js';
import renderRoute from './routes/render.js';
import filesRoute from './routes/files.js';
import snapshotRoute from './routes/snapshot.js';

const app = Fastify({
  logger: { level: 'info' },
  bodyLimit: 50 * 1024 * 1024,
});

await app.register(cors, { origin: true });

await mkdir(WORK_DIR, { recursive: true });

await app.register(async (api) => {
  api.get<{ Querystring: { jobId: string } }>('/progress', (req, reply) => {
    const { jobId } = req.query;
    if (!jobId) return reply.code(400).send({ error: 'jobId 必填' });
    attachSSE(reply, jobId);
  });

  api.get('/health', async () => ({ ok: true }));

  await api.register(probeRoute);
  await api.register(transcribeRoute);
  await api.register(autocutRoute);
  await api.register(renderRoute);
  await api.register(filesRoute);
  await api.register(snapshotRoute);
}, { prefix: '/api' });

app.listen({ port: PORT, host: '127.0.0.1' })
  .then(() => app.log.info(`cut-video 后端已启动 http://localhost:${PORT}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
