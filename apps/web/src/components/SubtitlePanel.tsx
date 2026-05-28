import { useStore } from '../lib/store';
import { startTranscribe, subscribeProgress, autocut } from '../lib/api';
import { fmtTime } from '../lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2, CheckSquare, Square, RefreshCcw } from 'lucide-react';

export default function SubtitlePanel() {
  const inputPath = useStore((s) => s.inputPath);
  const info = useStore((s) => s.info);
  const cues = useStore((s) => s.cues);
  const cueEnabled = useStore((s) => s.cueEnabled);
  const stage = useStore((s) => s.stage);
  const message = useStore((s) => s.message);
  const progress = useStore((s) => s.progress);
  const setCues = useStore((s) => s.setCues);
  const toggleCue = useStore((s) => s.toggleCue);
  const setAllCues = useStore((s) => s.setAllCues);
  const updateCueText = useStore((s) => s.updateCueText);
  const setSegments = useStore((s) => s.setSegments);
  const setStage = useStore((s) => s.setStage);
  const setError = useStore((s) => s.setError);
  const rules = useStore((s) => s.rules);
  const [language, setLanguage] = useState<'auto' | 'zh' | 'en'>('zh');
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => () => unsubRef.current?.(), []);

  async function runTranscribe() {
    if (!inputPath) return;
    setStage('transcribing', '正在抽取音轨...', 0);
    try {
      const jobId = await startTranscribe(inputPath, language);
      unsubRef.current = subscribeProgress(jobId, (e) => {
        if (e.stage === 'error') {
          setError(e.message ?? '转写失败');
        } else if (e.stage === 'done' && e.data?.cues) {
          setCues(e.data.cues);
          // 转写完成后自动算一次剪辑片段
          setTimeout(() => recalcSegments(e.data.cues), 0);
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

  async function recalcSegments(cuesArg = cues) {
    if (!info) return;
    try {
      const enabledIdx = (cueEnabled.length > 0 ? cueEnabled : cuesArg.map(() => true))
        .map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
      const r = await autocut({
        duration: info.duration,
        cues: cuesArg,
        rules: {
          removeSilence: rules.removeSilence,
          silencePadding: rules.silencePadding,
          minClipDuration: rules.minClipDuration,
          keepOnlyMarkedCues: enabledIdx,
        },
      });
      setSegments(r.segments, r.stats);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // 当规则或勾选变化时,重算
  useEffect(() => {
    if (cues.length > 0) recalcSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueEnabled, rules]);

  return (
    <div className="bg-bg-panel border border-border rounded-xl flex flex-col min-h-0 flex-1">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Languages className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">字幕</div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="ml-2 text-xs bg-bg-card border border-border rounded px-2 py-1"
        >
          <option value="auto">自动检测</option>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          {cues.length > 0 && (
            <>
              <button
                className="text-xs text-white/60 hover:text-white"
                onClick={() => setAllCues(true)}
                title="全选"
              ><CheckSquare className="w-3.5 h-3.5" /></button>
              <button
                className="text-xs text-white/60 hover:text-white"
                onClick={() => setAllCues(false)}
                title="全不选"
              ><Square className="w-3.5 h-3.5" /></button>
              <button
                className="text-xs text-white/60 hover:text-white"
                onClick={runTranscribe}
                title="重新转写"
              ><RefreshCcw className="w-3.5 h-3.5" /></button>
            </>
          )}
          <button
            disabled={!inputPath || stage === 'transcribing' || stage === 'rendering'}
            onClick={runTranscribe}
            className="px-3 py-1 bg-accent hover:bg-accent-glow disabled:bg-bg-hover disabled:text-white/40 rounded text-xs font-medium transition flex items-center gap-1"
          >
            {stage === 'transcribing' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 转写中</>
            ) : (
              cues.length > 0 ? '重新转写' : '开始转写'
            )}
          </button>
        </div>
      </div>

      {stage === 'transcribing' && (
        <div className="px-3 py-2 border-b border-border bg-bg-card">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">{message}</span>
            <span className="font-mono text-accent">{Math.floor(progress * 100)}%</span>
          </div>
          <div className="h-1 bg-bg-hover rounded">
            <div className="h-full bg-accent rounded transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {cues.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-white/40 text-center px-6">
            点击右上角"开始转写"使用 Whisper 自动识别语音生成字幕<br/>
            <span className="text-xs mt-2 block">10 分钟视频通常 1-3 分钟完成</span>
          </div>
        ) : (
          cues.map((c, i) => (
            <div
              key={i}
              className={`group rounded-md px-2 py-1.5 mb-1 border-l-2 transition ${
                cueEnabled[i]
                  ? 'border-accent bg-bg-card hover:bg-bg-hover'
                  : 'border-transparent bg-bg-card/40 opacity-50 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-white/50 font-mono mb-0.5">
                <input
                  type="checkbox"
                  checked={cueEnabled[i]}
                  onChange={() => toggleCue(i)}
                  className="accent-accent"
                />
                <span>{fmtTime(c.start)} → {fmtTime(c.end)}</span>
                <span className="ml-auto text-white/30">{(c.end - c.start).toFixed(1)}s</span>
              </div>
              <textarea
                rows={1}
                value={c.text}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  updateCueText(i, e.target.value);
                }}
                className="w-full bg-transparent resize-none text-sm leading-5 focus:outline-none focus:bg-bg/50 rounded px-1"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
