export interface ProbeInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  videoCodec: string;
  audioCodec: string | null;
  size: number;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export async function probe(path: string): Promise<ProbeInfo> {
  const r = await fetch('/api/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.info;
}

export async function startTranscribe(path: string, language = 'auto'): Promise<string> {
  const r = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, language }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.jobId;
}

export async function autocut(args: {
  duration: number;
  cues: SubtitleCue[];
  rules: {
    removeSilence?: boolean;
    silencePadding?: number;
    minClipDuration?: number;
    keepOnlyMarkedCues?: number[];
  };
}): Promise<{ segments: [number, number][]; stats: any }> {
  const r = await fetch('/api/autocut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j;
}

export async function startRender(args: {
  input: string;
  output: string;
  segments: [number, number][];
  cues?: SubtitleCue[];
  burnSubtitle?: boolean;
  bgmPath?: string | null;
  bgmVolume?: number;
  keepOriginalAudio?: boolean;
  remapSubtitles?: boolean;
}): Promise<string> {
  const r = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.jobId;
}

export interface ProgressEvent {
  jobId: string;
  stage: string;
  progress?: number;
  message?: string;
  data?: any;
}

export function subscribeProgress(jobId: string, onEvent: (e: ProgressEvent) => void): () => void {
  const es = new EventSource(`/api/progress?jobId=${encodeURIComponent(jobId)}`);
  es.onmessage = (msg) => {
    try { onEvent(JSON.parse(msg.data)); } catch {}
  };
  es.onerror = () => { /* 静默 */ };
  return () => es.close();
}

export function fileUrl(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}
