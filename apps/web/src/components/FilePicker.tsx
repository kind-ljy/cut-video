import { useState } from 'react';
import { useStore } from '../lib/store';
import { probe } from '../lib/api';
import { Upload, FolderOpen } from 'lucide-react';

export default function FilePicker() {
  const setInput = useStore((s) => s.setInput);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(p: string) {
    setError(null);
    setLoading(true);
    try {
      const info = await probe(p);
      setInput(p, info);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  // 支持把 Finder 拖来的文件转成本地路径(浏览器 webkitGetAsEntry / webkitRelativePath)
  // 浏览器不能直接拿到拖入文件的"绝对路径",但可以提示用户复制路径
  return (
    <div className="w-[640px] max-w-[90vw] bg-bg-panel border border-border rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <div className="text-lg font-semibold">选择本地视频</div>
          <div className="text-xs text-white/40">复制视频文件的绝对路径,或点击按钮选择</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="/Users/.../DJI_0001.mp4"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && path && load(path)}
            className="flex-1 px-3 py-2.5 bg-bg-card border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-accent"
          />
          <button
            disabled={!path || loading}
            onClick={() => load(path)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-glow disabled:bg-bg-hover disabled:text-white/40 rounded-lg text-sm font-medium transition"
          >
            {loading ? '读取中...' : '加载'}
          </button>
        </div>

        <input
          type="file"
          accept="video/*"
          id="file-input"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && (f as any).path) load((f as any).path);
            else if (f) {
              // 浏览器普通环境拿不到绝对路径,提示用户
              setError('浏览器无法获取文件绝对路径,请直接将路径粘贴到上方输入框');
            }
          }}
        />
        <button
          onClick={() => document.getElementById('file-input')?.click()}
          className="w-full px-4 py-3 bg-bg-card hover:bg-bg-hover border border-dashed border-border rounded-lg text-sm flex items-center justify-center gap-2 transition"
        >
          <FolderOpen className="w-4 h-4 text-accent" />
          打开文件选择器
        </button>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="text-xs text-white/40 leading-relaxed pt-2 border-t border-border">
          💡 <b>小提示</b>:在 Finder 中右键视频 → "拷贝 ...的路径名称"(按住 Option),然后粘贴到上方输入框。<br />
          支持 .mp4 / .mov / .mkv 等格式,大文件(11GB+)直接读硬盘,无需上传。
        </div>
      </div>
    </div>
  );
}
