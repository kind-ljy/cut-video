import { useStore } from '../lib/store';
import { Music } from 'lucide-react';

export default function AudioPanel() {
  const bgmPath = useStore((s) => s.bgmPath);
  const bgmVolume = useStore((s) => s.bgmVolume);
  const keepOriginalAudio = useStore((s) => s.keepOriginalAudio);
  const setBgm = useStore((s) => s.setBgm);

  return (
    <div className="bg-bg-panel border border-border rounded-xl flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Music className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">音频</div>
      </div>

      <div className="p-3 space-y-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={keepOriginalAudio}
            onChange={(e) => setBgm({ keepOriginal: e.target.checked })}
            className="accent-accent"
          />
          <span>保留原声</span>
        </label>

        <div>
          <div className="text-xs text-white/50 mb-1">背景音乐(BGM)</div>
          <input
            type="text"
            placeholder="粘贴本地音乐文件绝对路径(可选)"
            value={bgmPath ?? ''}
            onChange={(e) => setBgm({ path: e.target.value || null })}
            className="w-full px-2 py-1.5 bg-bg-card border border-border rounded font-mono text-xs focus:outline-none focus:border-accent"
          />
        </div>

        {bgmPath && (
          <div>
            <div className="text-xs text-white/50 mb-1 flex justify-between">
              <span>BGM 音量</span>
              <span className="font-mono">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bgmVolume}
              onChange={(e) => setBgm({ volume: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        )}

        <div className="text-xs text-white/40 leading-relaxed pt-2 border-t border-border">
          支持 mp3 / wav / m4a / flac 等格式。BGM 会自动循环铺满视频。
        </div>
      </div>
    </div>
  );
}
