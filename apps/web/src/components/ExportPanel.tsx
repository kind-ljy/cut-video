import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { startRender, subscribeProgress } from '../lib/api';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

export default function ExportPanel() {
  const inputPath = useStore((s) => s.inputPath);
  const outputPath = useStore((s) => s.outputPath);
  const setOutputPath = useStore((s) => s.setOutputPath);
  const segments = useStore((s) => s.segments);
  const cues = useStore((s) => s.cues);
  const cueEnabled = useStore((s) => s.cueEnabled);
  const burnSubtitle = useStore((s) => s.burnSubtitle);
  const setBurnSubtitle = useStore((s) => s.setBurnSubtitle);
  const bgmPath = useStore((s) => s.bgmPath);
  const bgmVolume = useStore((s) => s.bgmVolume);
  const keepOriginalAudio = useStore((s) => s.keepOriginalAudio);
  const watermarks = useStore((s) => s.watermarks);
  const stage = useStore((s) => s.stage);
  const message = useStore((s) => s.message);
  const progress = useStore((s) => s.progress);
  const resultPath = useStore((s) => s.resultPath);
  const setStage = useStore((s) => s.setStage);
  const setError = useStore((s) => s.setError);
  const setResultPath = useStore((s) => s.setResultPath);

  const unsubRef = useRef<null | (() => void)>(null);
  useEffect(() => () => unsubRef.current?.(), []);

  async function exportVideo() {
    if (!inputPath || !outputPath || segments.length === 0) {
      setError('未准备好:请先加载视频并完成转写');
      return;
    }
    setStage('rendering', '开始渲染...', 0);
    try {
      // 仅传启用的字幕
      const enabledCues = cues.filter((_, i) => cueEnabled[i]);
      const jobId = await startRender({
        input: inputPath,
        output: outputPath,
        segments,
        cues: enabledCues,
        burnSubtitle,
        bgmPath,
        bgmVolume,
        keepOriginalAudio,
        remapSubtitles: true,
        watermarks: watermarks.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h, method: w.method })),
      });
      unsubRef.current = subscribeProgress(jobId, (e) => {
        if (e.stage === 'error') {
          setError(e.message ?? '渲染失败');
          unsubRef.current?.();
        } else if (e.stage === 'done') {
          setResultPath(e.data?.output ?? outputPath);
          unsubRef.current?.();
        } else {
          useStore.setState({
            progress: e.progress ?? 0,
            message: e.message ?? '',
          });
        }
      });
    } catch (e: any) {
      setError(e.message);
    }
  }

  const ready = segments.length > 0 && stage !== 'rendering';

  return (
    <div className="bg-bg-panel border border-border rounded-xl flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Download className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">导出</div>
      </div>

      <div className="p-3 space-y-3 text-sm">
        <div>
          <div className="text-xs text-white/50 mb-1">输出文件路径</div>
          <input
            type="text"
            value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            className="w-full px-2 py-1.5 bg-bg-card border border-border rounded font-mono text-xs focus:outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={burnSubtitle}
            onChange={(e) => setBurnSubtitle(e.target.checked)}
            className="accent-accent"
            disabled={cues.length === 0}
          />
          <span>烧录字幕到画面</span>
          {cues.length === 0 && <span className="text-xs text-white/40">(无字幕)</span>}
        </label>

        {watermarks.length > 0 && (
          <div className="text-xs text-accent flex items-center gap-2">
            <span>✓ 将去除 {watermarks.length} 个水印/文字区域</span>
          </div>
        )}

        {stage === 'rendering' && (
          <div className="bg-bg-card border border-border rounded-lg p-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60 truncate flex-1">{message}</span>
              <span className="font-mono text-accent ml-2">{Math.floor(progress * 100)}%</span>
            </div>
            <div className="h-1 bg-bg-hover rounded">
              <div className="h-full bg-accent rounded transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'done' && resultPath && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> 渲染完成
            </div>
            <div className="font-mono text-white/70 break-all">{resultPath}</div>
          </div>
        )}

        <button
          disabled={!ready}
          onClick={exportVideo}
          className="w-full px-4 py-2.5 bg-accent hover:bg-accent-glow disabled:bg-bg-hover disabled:text-white/40 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {stage === 'rendering'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> 渲染中...</>
            : <><Download className="w-4 h-4" /> 开始导出</>
          }
        </button>
      </div>
    </div>
  );
}
