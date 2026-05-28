/**
 * 本地文件流式访问 + range 请求(支持视频拖拽预览)
 */
import type { FastifyInstance } from 'fastify';
import { stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';

export default async function filesRoute(app: FastifyInstance) {
  app.get<{ Querystring: { path: string } }>('/files', async (req, reply) => {
    const filePath = req.query.path;
    if (!filePath) return reply.code(400).send({ error: 'path 必填' });
    let stats;
    try {
      stats = await stat(filePath);
    } catch {
      return reply.code(404).send({ error: '文件不存在' });
    }
    if (!stats.isFile()) return reply.code(400).send({ error: '不是文件' });

    const range = req.headers.range;
    const total = stats.size;
    const ext = filePath.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? '';
    const ct = mimeType(ext);

    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/);
      if (m) {
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : Math.min(start + 1024 * 1024 * 8, total - 1);
        reply
          .code(206)
          .header('Content-Range', `bytes ${start}-${end}/${total}`)
          .header('Accept-Ranges', 'bytes')
          .header('Content-Length', String(end - start + 1))
          .header('Content-Type', ct);
        return reply.send(createReadStream(filePath, { start, end }));
      }
    }
    reply
      .header('Content-Length', String(total))
      .header('Accept-Ranges', 'bytes')
      .header('Content-Type', ct);
    return reply.send(createReadStream(filePath));
  });
}

function mimeType(ext: string): string {
  switch (ext) {
    case 'mp4': case 'm4v': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'mkv': return 'video/x-matroska';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'm4a': case 'aac': return 'audio/aac';
    case 'flac': return 'audio/flac';
    case 'ogg': return 'audio/ogg';
    case 'srt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}
