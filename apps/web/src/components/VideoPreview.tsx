import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { fileUrl } from '../lib/api';
import { fmtTime, fmtSize, fmtBitrate } from '../lib/utils';

export default function VideoPreview() {
  const inputPath = useStore((s) => s.inputPath);
  const info = useStore((s) => s.info);
  const cues = useStore((s) => s.cues);
  const segments = useStore((s) => s.segments);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, []);

  if (!inputPath || !info) return null;

  const activeCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);

  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden flex flex-col min-h-0 flex-1">
      <div className="px-3 py-2 border-b border-border flex items-center gap-3 text-xs text-white/60">
        <span><b className="text-white/80">{info.width}×{info.height}</b> · {info.fps.toFixed(0)} fps</span>
        <span>·</span>
        <span>{info.videoCodec}{info.audioCodec ? ` + ${info.audioCodec}` : ''}</span>
        <span>·</span>
        <span>{fmtBitrate(info.bitrate)}</span>
        <span>·</span>
        <span>{fmtSize(info.size)}</span>
        <span className="ml-auto font-mono">
          {fmtTime(currentTime)} / {fmtTime(info.duration)}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center bg-black relative">
        <video
          ref={videoRef}
          src={fileUrl(inputPath)}
          controls
          className="max-h-full max-w-full"
          preload="metadata"
        />
        {activeCue && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 text-white rounded text-base font-medium pointer-events-none max-w-[80%] text-center">
            {activeCue.text}
          </div>
        )}
      </div>

      {/* 时间轴可视化 */}
      <div className="h-8 bg-bg-card border-t border-border relative">
        {segments.map(([s, e], i) => (
          <div
            key={i}
            className="absolute top-1 bottom-1 bg-accent/40 hover:bg-accent/60 rounded-sm cursor-pointer"
            style={{
              left: `${(s / info.duration) * 100}%`,
              width: `${((e - s) / info.duration) * 100}%`,
            }}
            title={`${fmtTime(s)} - ${fmtTime(e)}`}
            onClick={() => { if (videoRef.current) videoRef.current.currentTime = s; }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none"
          style={{ left: `${(currentTime / info.duration) * 100}%` }}
        />
      </div>
    </div>
  );
}
