import { useEffect, useRef, useState } from 'react';
import { useStore, type WatermarkRegion } from '../lib/store';
import { fileUrl, snapshot } from '../lib/api';
import { Eraser, Trash2, RefreshCw, Loader2 } from 'lucide-react';

type Method = WatermarkRegion['method'];

const METHODS: { value: Method; label: string; hint: string }[] = [
  { value: 'delogo',   label: '智能修复', hint: '邻域插值,适合纯色或简单背景的台标/水印' },
  { value: 'blur',     label: '模糊',     hint: '高斯模糊,适合面孔/隐私信息' },
  { value: 'pixelate', label: '马赛克',   hint: '马赛克化,效果更明显' },
];

export default function WatermarkPanel() {
  const inputPath = useStore((s) => s.inputPath);
  const info = useStore((s) => s.info);
  const watermarks = useStore((s) => s.watermarks);
  const watermarkMethod = useStore((s) => s.watermarkMethod);
  const addWatermark = useStore((s) => s.addWatermark);
  const removeWatermark = useStore((s) => s.removeWatermark);
  const clearWatermarks = useStore((s) => s.clearWatermarks);
  const setWatermarkMethod = useStore((s) => s.setWatermarkMethod);

  const [snapTime, setSnapTime] = useState(0);
  const [snapPath, setSnapPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // 加载帧
  useEffect(() => {
    if (!inputPath) return;
    setLoading(true);
    snapshot(inputPath, snapTime)
      .then((p) => setSnapPath(p))
      .catch(() => setSnapPath(null))
      .finally(() => setLoading(false));
  }, [inputPath, snapTime]);

  if (!inputPath || !info) return null;

  // 视频原始尺寸
  const vw = info.width, vh = info.height;
  // 显示区域(image 实际渲染尺寸)
  const dw = imgSize?.w ?? 0;
  const dh = imgSize?.h ?? 0;
  const scale = dw > 0 ? dw / vw : 1;

  function vidToScreen(r: { x: number; y: number; w: number; h: number }) {
    return { x: r.x * scale, y: r.y * scale, w: r.w * scale, h: r.h * scale };
  }
  function screenToVid(r: { x: number; y: number; w: number; h: number }) {
    return {
      x: Math.round(r.x / scale),
      y: Math.round(r.y / scale),
      w: Math.round(r.w / scale),
      h: Math.round(r.h / scale),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ x0: x, y0: y, x1: x, y1: y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drawing || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDrawing({ ...drawing, x1: x, y1: y });
  }
  function onMouseUp() {
    if (!drawing) return;
    const x = Math.min(drawing.x0, drawing.x1);
    const y = Math.min(drawing.y0, drawing.y1);
    const w = Math.abs(drawing.x1 - drawing.x0);
    const h = Math.abs(drawing.y1 - drawing.y0);
    if (w > 6 && h > 6) {
      const r = screenToVid({ x, y, w, h });
      addWatermark({ ...r, method: watermarkMethod });
    }
    setDrawing(null);
  }

  return (
    <div className="bg-bg-panel border border-border rounded-xl flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Eraser className="w-4 h-4 text-accent" />
        <div className="text-sm font-medium">去文字 / 水印</div>

        <select
          value={watermarkMethod}
          onChange={(e) => setWatermarkMethod(e.target.value as Method)}
          className="ml-auto text-xs bg-bg-card border border-border rounded px-2 py-1"
          title={METHODS.find((m) => m.value === watermarkMethod)?.hint}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {watermarks.length > 0 && (
          <button
            onClick={clearWatermarks}
            className="text-xs text-white/60 hover:text-red-400"
            title="清空所有区域"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">取帧时间</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, info.duration - 0.1)}
            step={0.1}
            value={snapTime}
            onChange={(e) => setSnapTime(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="font-mono text-white/60 tabular-nums w-12 text-right">
            {snapTime.toFixed(1)}s
          </span>
          <button
            onClick={() => setSnapTime((t) => t)}
            className="text-white/60 hover:text-white"
            title="刷新"
          ><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>

        <div
          ref={containerRef}
          className="relative bg-black rounded-md overflow-hidden select-none"
          style={{ minHeight: 120 }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs gap-2 z-10">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 抽帧中...
            </div>
          )}
          {snapPath ? (
            <>
              <img
                ref={imgRef}
                src={fileUrl(snapPath)}
                alt="frame"
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setImgSize({ w: el.clientWidth, h: el.clientHeight });
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                className="block w-full cursor-crosshair"
              />
              {/* 已添加的区域 */}
              {watermarks.map((wm) => {
                const s = vidToScreen(wm);
                return (
                  <div
                    key={wm.id}
                    className="absolute border-2 border-accent bg-accent/10 group"
                    style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                  >
                    <div className="absolute -top-5 left-0 text-[10px] font-mono bg-accent text-black px-1 rounded whitespace-nowrap">
                      #{watermarks.indexOf(wm) + 1} · {METHODS.find((m) => m.value === wm.method)?.label}
                    </div>
                    <button
                      onClick={() => removeWatermark(wm.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition"
                      title="删除"
                    >×</button>
                  </div>
                );
              })}
              {/* 正在绘制的框 */}
              {drawing && (
                <div
                  className="absolute border-2 border-accent-glow bg-accent/20 pointer-events-none"
                  style={{
                    left: Math.min(drawing.x0, drawing.x1),
                    top: Math.min(drawing.y0, drawing.y1),
                    width: Math.abs(drawing.x1 - drawing.x0),
                    height: Math.abs(drawing.y1 - drawing.y0),
                  }}
                />
              )}
            </>
          ) : !loading && (
            <div className="aspect-video flex items-center justify-center text-xs text-white/40">
              加载预览帧失败
            </div>
          )}
        </div>

        {watermarks.length === 0 ? (
          <div className="text-xs text-white/40 leading-relaxed">
            💡 在帧画面上 <b>按住鼠标拖动</b> 框选要去除的区域(可加多个)。<br/>
            导出时会自动应用到整个视频。
          </div>
        ) : (
          <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
            {watermarks.map((wm, i) => (
              <div key={wm.id} className="flex items-center gap-2 px-2 py-1 bg-bg-card rounded">
                <span className="font-mono text-accent">#{i + 1}</span>
                <span className="text-white/60 font-mono">
                  {wm.x},{wm.y} · {wm.w}×{wm.h}
                </span>
                <span className="ml-auto text-white/50">{METHODS.find((m) => m.value === wm.method)?.label}</span>
                <button
                  onClick={() => removeWatermark(wm.id)}
                  className="text-white/40 hover:text-red-400"
                ><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
