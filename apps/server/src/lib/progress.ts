/**
 * 简单进度发布 / 订阅,用于 SSE 推送
 * 每个任务有一个 jobId,前端订阅 /api/progress?jobId=xxx
 */
import type { FastifyReply } from 'fastify';

type Listener = (event: ProgressEvent) => void;

export interface ProgressEvent {
  jobId: string;
  stage: string;       // probe / extract-audio / transcribe / render / done / error
  progress?: number;   // 0..1
  message?: string;
  data?: unknown;
}

const listeners = new Map<string, Set<Listener>>();

export function publish(evt: ProgressEvent) {
  const set = listeners.get(evt.jobId);
  if (set) for (const l of set) l(evt);
}

export function subscribe(jobId: string, l: Listener): () => void {
  let set = listeners.get(jobId);
  if (!set) {
    set = new Set();
    listeners.set(jobId, set);
  }
  set.add(l);
  return () => {
    set?.delete(l);
    if (set?.size === 0) listeners.delete(jobId);
  };
}

export function attachSSE(reply: FastifyReply, jobId: string) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (evt: ProgressEvent) => {
    reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
  };
  const unsub = subscribe(jobId, send);
  reply.raw.on('close', () => unsub());
  // 立即发心跳,避免代理缓冲
  reply.raw.write(`: connected\n\n`);
}

export function newJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
