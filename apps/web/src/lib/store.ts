import { create } from 'zustand';
import type { ProbeInfo, SubtitleCue } from './api';

export type Stage = 'idle' | 'transcribing' | 'transcribed' | 'rendering' | 'done' | 'error';

export interface WatermarkRegion {
  id: string;
  x: number; y: number; w: number; h: number;       // 像素坐标(基于源视频)
  method: 'delogo' | 'blur' | 'pixelate';
  label?: string;
}

interface State {
  inputPath: string | null;
  info: ProbeInfo | null;
  cues: SubtitleCue[];
  cueEnabled: boolean[];
  rules: {
    removeSilence: boolean;
    silencePadding: number;
    minClipDuration: number;
  };
  segments: [number, number][];
  stats: { keptDuration: number; removedDuration: number; clipCount: number } | null;

  bgmPath: string | null;
  bgmVolume: number;
  keepOriginalAudio: boolean;

  burnSubtitle: boolean;

  // 去水印
  watermarks: WatermarkRegion[];
  watermarkMethod: 'delogo' | 'blur' | 'pixelate';

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
  addWatermark(r: Omit<WatermarkRegion, 'id'>): void;
  updateWatermark(id: string, p: Partial<WatermarkRegion>): void;
  removeWatermark(id: string): void;
  clearWatermarks(): void;
  setWatermarkMethod(m: 'delogo' | 'blur' | 'pixelate'): void;
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
  watermarks: [] as WatermarkRegion[],
  watermarkMethod: 'delogo' as 'delogo' | 'blur' | 'pixelate',
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
      watermarks: [],
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
  addWatermark(r) {
    const id = `wm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set({ watermarks: [...get().watermarks, { ...r, id }] });
  },
  updateWatermark(id, p) {
    set({
      watermarks: get().watermarks.map((w) => (w.id === id ? { ...w, ...p } : w)),
    });
  },
  removeWatermark(id) {
    set({ watermarks: get().watermarks.filter((w) => w.id !== id) });
  },
  clearWatermarks() { set({ watermarks: [] }); },
  setWatermarkMethod(m) {
    // 同时把现有的所有水印改成新方法
    set({
      watermarkMethod: m,
      watermarks: get().watermarks.map((w) => ({ ...w, method: m })),
    });
  },
  setStage(stage, message = '', progress = 0) { set({ stage, message, progress }); },
  setProgress(progress, message) { set({ progress, ...(message ? { message } : {}) }); },
  setError(error) { set({ error, stage: error ? 'error' : get().stage }); },
  setResultPath(resultPath) { set({ resultPath, stage: 'done' }); },
  reset() { set(initial); },
}));
