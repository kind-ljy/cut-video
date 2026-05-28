import { useStore } from '../lib/store';

export default function StatusBar() {
  const error = useStore((s) => s.error);
  const stage = useStore((s) => s.stage);
  if (!error && stage !== 'error') return (
    <footer className="h-6 shrink-0 border-t border-border bg-bg-panel px-3 flex items-center text-xs text-white/40">
      <span>本地运行 · 数据不上传 · ffmpeg + whisper.cpp</span>
    </footer>
  );
  return (
    <footer className="h-6 shrink-0 border-t border-red-500/40 bg-red-500/15 px-3 flex items-center text-xs text-red-300">
      <span>错误:{error}</span>
    </footer>
  );
}
