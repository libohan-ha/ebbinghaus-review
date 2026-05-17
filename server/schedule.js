// 艾宾浩斯遗忘曲线：做题当天 + 1, 3, 7, 15, 30, 60, 90 天，共 8 个节点
export const OFFSETS = [0, 1, 3, 7, 15, 30, 60, 90];

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 为目标生成全部复习计划
export function buildReviewPlan(targetType, targetId, studyDate) {
  return OFFSETS.map((offset, idx) => ({
    target_type: targetType,
    target_id: targetId,
    scheduled_date: addDays(studyDate, offset),
    offset_day: offset,
    stage: idx,
  }));
}

// 给定当前 stage 和反馈，决定下次 review 应在哪一天
// feedback: 'easy' | 'normal' | 'forgot' | null（简单打勾）
// 返回 null 表示已结束
export function nextAfter(currentStage, studyDate, feedback) {
  if (feedback === 'forgot') {
    // 重置到 stage 1（即明天再来一遍 1d 节点）
    return { stage: 1, scheduled_date: addDays(studyDate, OFFSETS[1]) };
  }
  const nextStage = currentStage + 1;
  if (nextStage >= OFFSETS.length) return null;
  return { stage: nextStage, scheduled_date: addDays(studyDate, OFFSETS[nextStage]) };
}
