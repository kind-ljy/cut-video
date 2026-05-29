import { useStore } from './lib/store';
import FilePicker from './components/FilePicker';
import VideoPreview from './components/VideoPreview';
import SubtitlePanel from './components/SubtitlePanel';
import CutRulesPanel from './components/CutRulesPanel';
import AudioPanel from './components/AudioPanel';
import WatermarkPanel from './components/WatermarkPanel';
import ExportPanel from './components/ExportPanel';
import StatusBar from './components/StatusBar';
import { Scissors } from 'lucide-react';

export default function App() {
  const inputPath = useStore((s) => s.inputPath);

  return (
    <div className="h-screen flex flex-col bg-bg text-[#e4e7ee] font-sans">
      {/* Header */}
      <header className="h-12 shrink-0 border-b border-border flex items-center px-4 gap-3 bg-bg-panel">
        <Scissors className="w-5 h-5 text-accent" />
        <div className="font-semibold tracking-wide">cut-video</div>
        <div className="text-xs text-white/40">本地自动剪辑 · 字幕 · 配乐 · 去水印</div>
        <div className="ml-auto text-xs text-white/40">
          {inputPath ? <span className="font-mono">{shortPath(inputPath)}</span> : null}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {!inputPath ? (
          <div className="col-span-12 flex items-center justify-center">
            <FilePicker />
          </div>
        ) : (
          <>
            {/* Left: 预览 + 规则/音频 */}
            <section className="col-span-7 flex flex-col gap-3 min-h-0">
              <VideoPreview />
              <div className="grid grid-cols-2 gap-3">
                <CutRulesPanel />
                <AudioPanel />
              </div>
            </section>

            {/* Right: 水印 + 字幕 + 导出 */}
            <section className="col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
              <WatermarkPanel />
              <SubtitlePanel />
              <ExportPanel />
            </section>
          </>
        )}
      </main>

      <StatusBar />
    </div>
  );
}

function shortPath(p: string): string {
  if (p.length <= 60) return p;
  return p.slice(0, 24) + '...' + p.slice(-30);
}
