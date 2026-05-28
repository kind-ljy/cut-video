import { create } from 'zustand';
import type { ProbeInfo, SubtitleCue } from './api';

export type Stage = 'idle' | 'transcribing' | 'transcribed' | 'rendering' | 'done' | 'error';

interface State {
  inputPath: string | null;
  info: ProbeInfo | null;
  cues: SubtitleCue[];
  // 字幕段是否启用(对应 cue index -> bool)
  cueEnabled: boolean[];
  // 自动剪辑规则
  rules: {
    removeSilence: boolean;
    silencePadding: number;
    minClipDuration: number;
  };
  segments: [number, number][];
  stats: { keptDuration: number; removedDuration: number; clipCount: number } | null;

  // 音频
  bgmPath: string | null;
  bgmVolume: number;
  keepOriginalAudio: boolean;

  // 字幕导出
  burnSubtitle: boolean;

  // 输出
  outputPath: string;

  stage: Stage;
  progress: number;
  message: string;
  error: string | null;
  resultPath: string | null;

  setInput(path: string, info: ProbeInfo): void;
  setCues(cues: SubtitleCue[]): void;
  toggleCue(i: number): void;
  setAllCues(enabled: boolean): void;
  updateCueText(i: number, text: string): void;
  setRules(p: Partial<State['rules']>): void;
  setSegments(s: [number, number][], stats: any): void;
  setBgm(p: { path?: string | null; volume?: number; keepOriginal?: boolean }): void;
  setBurnSubtitle(b: boolean): void;
  setOutputPath(p: string): void;
  setStage(s: Stage, msg?: string, progress?: number): void;
  setProgress(p: number, msg?: string): void;
  setError(e: string | null): void;
  setResultPath(p: string | null): void;
  reset(): void;
}

const initial = {
  inputPath: null,
  info: null,
  cues: [],
  cueEnabled: [],
  rules: {
    removeSilence: true,
    silencePadding: 0.2,
    minClipDuration: 0.4,
  },
  segments: [],
  stats: null,
  bgmPath: null,
  bgmVolume: 0.3,
  keepOriginalAudio: true,
  burnSubtitle: true,
  outputPath: '',
  stage: 'idle' as Stage,
  progress: 0,
  message: '',
  error: null,
  resultPath: null,
};

export const useStore = create<State>((set, get) => ({
  ...initial,

  setInput(path, info) {
    const stem = path.replace(/\.[^.]+$/, '');
    set({
      inputPath: path,
      info,
      outputPath: `${stem}_cut.mp4`,
      cues: [], cueEnabled: [], segments: [], stats: null,
      stage: 'idle', progress: 0, message: '', error: null, resultPath: null,
    });
  },
  setCues(cues) {
    set({ cues, cueEnabled: cues.map(() => true), stage: 'transcribed' });
  },
  toggleCue(i) {
    const cueEnabled = [...get().cueEnabled];
    cueEnabled[i] = !cueEnabled[i];
    set({ cueEnabled });
  },
  setAllCues(enabled) {
    set({ cueEnabled: get().cueEnabled.map(() => enabled) });
  },
  updateCueText(i, text) {
    const cues = [...get().cues];
    cues[i] = { ...cues[i], text };
    set({ cues });
  },
  setRules(p) { set({ rules: { ...get().rules, ...p } }); },
  setSegments(segments, stats) { set({ segments, stats }); },
  setBgm(p) {
    set({
      bgmPath: p.path !== undefined ? p.path : get().bgmPath,
      bgmVolume: p.volume !== undefined ? p.volume : get().bgmVolume,
      keepOriginalAudio: p.keepOriginal !== undefined ? p.keepOriginal : get().keepOriginalAudio,
    });
  },
  setBurnSubtitle(b) { set({ burnSubtitle: b }); },
  setOutputPath(p) { set({ outputPath: p }); },
  setStage(stage, message = '', progress = 0) { set({ stage, message, progress }); },
  setProgress(progress, message) { set({ progress, ...(message ? { message } : {}) }); },
  setError(error) { set({ error, stage: error ? 'error' : get().stage }); },
  setResultPath(resultPath) { set({ resultPath, stage: 'done' }); },
  reset() { set(initial); },
}));
