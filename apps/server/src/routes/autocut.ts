/**
 * 自动剪辑规则计算:输入 (视频时长 + 字幕 cues + 规则配置),输出"建议保留片段"
 */
import type { FastifyInstance } from 'fastify';

interface CutRequest {
  duration: number;
  cues: { start: number; end: number; text: string }[];
  rules: {
    removeSilence?: boolean;       // 删除字幕之间的空白
    silencePadding?: number;       // 字幕段前后保留秒数(默认 0.2s)
    minClipDuration?: number;      // 合并后小于此值的剪辑就丢掉
    keepOnlyMarkedCues?: number[]; // 仅保留指定 index 的字幕段(可选)
  };
}

export default async function autocutRoute(app: FastifyInstance) {
  app.post<{ Body: CutRequest }>('/autocut', async (req, reply) => {
    const { duration, cues, rules } = req.body;
    const padding = rules.silencePadding ?? 0.2;
    const minDur = rules.minClipDuration ?? 0.4;

    let workingCues = cues;
    if (rules.keepOnlyMarkedCues && rules.keepOnlyMarkedCues.length > 0) {
      const set = new Set(rules.keepOnlyMarkedCues);
      workingCues = cues.filter((_, i) => set.has(i));
    }

    let segments: [number, number][];
    if (rules.removeSilence) {
      segments = workingCues.map((c) => {
        return [Math.max(0, c.start - padding), Math.min(duration, c.end + padding)] as [number, number];
      });
      // 合并相邻 / 重叠片段
      segments.sort((a, b) => a[0] - b[0]);
      const merged: [number, number][] = [];
      for (const seg of segments) {
        const last = merged[merged.length - 1];
        if (last && seg[0] <= last[1] + 0.05) {
          last[1] = Math.max(last[1], seg[1]);
        } else {
          merged.push([...seg]);
        }
      }
      segments = merged.filter(([s, e]) => e - s >= minDur);
    } else if (rules.keepOnlyMarkedCues && rules.keepOnlyMarkedCues.length > 0) {
      segments = workingCues.map((c) => [c.start, c.end] as [number, number]);
    } else {
      segments = [[0, duration]];
    }

    const totalKept = segments.reduce((a, [s, e]) => a + (e - s), 0);
    return reply.send({
      ok: true,
      segments,
      stats: {
        originalDuration: duration,
        keptDuration: totalKept,
        removedDuration: duration - totalKept,
        clipCount: segments.length,
      },
    });
  });
}
