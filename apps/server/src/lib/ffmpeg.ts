/**
 * ffmpeg / ffprobe 调用封装
 */
import { execa, type ExecaError } from 'execa';
import { publish } from './progress.js';

export interface ProbeResult {
  duration: number;       // 秒
  width: number;
  height: number;
  fps: number;
  bitrate: number;        // bps
  videoCodec: string;
  audioCodec: string | null;
  size: number;           // bytes
}

export async function ffprobe(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execa('ffprobe', [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-of', 'json',
    filePath,
  ]);
  const info = JSON.parse(stdout);
  const v = info.streams.find((s: any) => s.codec_type === 'video');
  const a = info.streams.find((s: any) => s.codec_type === 'audio');
  if (!v) throw new Error('未找到视频流');
  const fps = (() => {
    if (!v.avg_frame_rate) return 0;
    const [n, d] = String(v.avg_frame_rate).split('/').map(Number);
    return d ? n / d : n;
  })();
  return {
    duration: parseFloat(info.format.duration ?? '0'),
    width: v.width,
    height: v.height,
    fps,
    bitrate: parseInt(info.format.bit_rate ?? '0', 10),
    videoCodec: v.codec_name,
    audioCodec: a?.codec_name ?? null,
    size: parseInt(info.format.size ?? '0', 10),
  };
}

/**
 * 抽出 16kHz 单声道 wav (供 whisper 用)
 */
export async function extractAudioForWhisper(input: string, output: string, jobId?: string) {
  if (jobId) publish({ jobId, stage: 'extract-audio', progress: 0, message: '抽取音轨...' });
  await execa('ffmpeg', [
    '-y',
    '-i', input,
    '-ac', '1',
    '-ar', '16000',
    '-vn',
    output,
  ]);
  if (jobId) publish({ jobId, stage: 'extract-audio', progress: 1, message: '音轨抽取完成' });
}

/**
 * 检测静默片段。返回 [start, end][] (秒,语音段)
 */
export async function detectVoicedSegments(
  input: string,
  options: { silenceDb: number; minSilenceDur: number; totalDuration: number }
): Promise<[number, number][]> {
  const { silenceDb, minSilenceDur, totalDuration } = options;
  try {
    await execa('ffmpeg', [
      '-i', input,
      '-af', `silencedetect=noise=${silenceDb}dB:d=${minSilenceDur}`,
      '-f', 'null', '-',
    ]);
  } catch (err) {
    // ffmpeg 输出在 stderr,正常会非零退出?其实 silencedetect 不会非零,这里做兜底
    const e = err as ExecaError;
    if (!e.stderr) throw err;
    return parseSilenceLog(String(e.stderr), totalDuration);
  }
  return [[0, totalDuration]];
}

function parseSilenceLog(log: string, totalDuration: number): [number, number][] {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const m of log.matchAll(/silence_start: ([\d.]+)/g)) starts.push(parseFloat(m[1]));
  for (const m of log.matchAll(/silence_end: ([\d.]+)/g)) ends.push(parseFloat(m[1]));
  // 反推语音段
  const voiced: [number, number][] = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s > cursor) voiced.push([cursor, s]);
    cursor = ends[i] ?? totalDuration;
  }
  if (cursor < totalDuration) voiced.push([cursor, totalDuration]);
  return voiced.filter(([s, e]) => e - s > 0.2); // 过滤过短的"语音"碎片
}

/**
 * 渲染最终视频
 * - segments: 要保留的片段 [start,end][]
 * - subtitlePath: srt 文件,可选;为 null 表示不要字幕
 * - bgmPath / bgmVolume: 背景音乐,可选
 * - keepOriginalAudio: 是否保留原声
 * - burnSubtitle: 是否烧录字幕
 */
export interface RenderOptions {
  input: string;
  output: string;
  segments: [number, number][];
  subtitlePath?: string | null;
  burnSubtitle?: boolean;
  bgmPath?: string | null;
  bgmVolume?: number; // 0..1
  keepOriginalAudio?: boolean;
  jobId?: string;
}

export async function renderVideo(opts: RenderOptions) {
  const {
    input, output, segments,
    subtitlePath, burnSubtitle = true,
    bgmPath, bgmVolume = 0.3,
    keepOriginalAudio = true,
    jobId,
  } = opts;

  if (segments.length === 0) throw new Error('保留片段为空');

  // 构建滤镜:用 trim 切多段后 concat
  const videoTrims: string[] = [];
  const audioTrims: string[] = [];
  segments.forEach(([s, e], i) => {
    videoTrims.push(`[0:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS[v${i}]`);
    audioTrims.push(`[0:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS[a${i}]`);
  });
  const vConcat = segments.map((_, i) => `[v${i}]`).join('') +
    `concat=n=${segments.length}:v=1:a=0[vout0]`;
  const aConcat = segments.map((_, i) => `[a${i}]`).join('') +
    `concat=n=${segments.length}:v=0:a=1[aout0]`;

  const filterParts: string[] = [...videoTrims, ...audioTrims, vConcat, aConcat];

  // 字幕烧录
  let videoOut = '[vout0]';
  if (subtitlePath && burnSubtitle) {
    // ffmpeg subtitles 滤镜需要单引号转义
    const escaped = subtitlePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
    filterParts.push(
      `[vout0]subtitles='${escaped}':force_style='FontName=PingFang SC,FontSize=22,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=40'[vout]`
    );
    videoOut = '[vout]';
  } else {
    filterParts.push(`[vout0]null[vout]`);
    videoOut = '[vout]';
  }

  // 音频混音
  let audioOut = '[aout0]';
  const args: string[] = ['-y', '-i', input];
  if (bgmPath) {
    args.push('-i', bgmPath);
    if (keepOriginalAudio) {
      filterParts.push(
        `[1:a]volume=${bgmVolume},aloop=loop=-1:size=2e9[bgm]`,
        `[aout0][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`
      );
    } else {
      filterParts.push(
        `[1:a]volume=${bgmVolume},aloop=loop=-1:size=2e9[aout]`
      );
    }
    audioOut = '[aout]';
  } else if (!keepOriginalAudio) {
    // 全静音
    filterParts.push(`[aout0]volume=0[aout]`);
    audioOut = '[aout]';
  }

  args.push(
    '-filter_complex', filterParts.join(';'),
    '-map', videoOut,
    '-map', audioOut,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    output
  );

  const child = execa('ffmpeg', args);
  // 进度从 stderr 解析
  let totalSec = segments.reduce((s, [a, b]) => s + (b - a), 0);
  child.stderr?.on('data', (chunk) => {
    const text = String(chunk);
    const m = text.match(/time=(\d+):(\d+):([\d.]+)/);
    if (m && jobId) {
      const sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
      publish({
        jobId,
        stage: 'render',
        progress: Math.min(1, sec / totalSec),
        message: `渲染中 ${sec.toFixed(1)}s / ${totalSec.toFixed(1)}s`,
      });
    }
  });
  await child;
  if (jobId) publish({ jobId, stage: 'done', progress: 1, message: '渲染完成', data: { output } });
}
