import { useStore } from '../lib/store';
import { fmtTime } from '../lib/utils';
import { Scissors } from 'lucide-react';

export default function CutRulesPanel() {
  const rules = useStore((s) => s.rules);
  const setRules = useStore((s) => s.setRules);
  const stats = useStore((s) => s.stats);
  const cues = useStore((s) => s.cues);

  return (
    <div className="bg-bg-panel border border-border rounded-xl flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Scissors className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">自动剪辑规则</div>
      </div>

      <div className="p-3 space-y-3 text-sm">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-accent"
              checked={rules.removeSilence}
              onChange={(e) => setRules({ removeSilence: e.target.checked })}
            />
            <span>删除静默片段(只保留有字幕的部分)</span>
          </span>
        </label>

        <div className={`pl-6 space-y-2 ${rules.removeSilence ? '' : 'opacity-50 pointer-events-none'}`}>
          <div>
            <div className="text-xs text-white/50 mb-1 flex justify-between">
              <span>每句前后保留</span>
              <span className="font-mono">{rules.silencePadding.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={rules.silencePadding}
              onChange={(e) => setRules({ silencePadding: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1 flex justify-between">
              <span>合并后片段最短时长</span>
              <span className="font-mono">{rules.minClipDuration.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={rules.minClipDuration}
              onChange={(e) => setRules({ minClipDuration: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        </div>

        {stats && cues.length > 0 && (
          <div className="pt-2 mt-2 border-t border-border space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">原视频时长</span>
              <span className="font-mono">{fmtTime(stats.originalDuration ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">保留时长</span>
              <span className="font-mono text-accent">{fmtTime(stats.keptDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">删除时长</span>
              <span className="font-mono text-red-400">{fmtTime(stats.removedDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">片段数</span>
              <span className="font-mono">{stats.clipCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
