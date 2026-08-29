/** XP amounts and daily caps — behavior only, never spend volume. */
export const XP_RULES = {
  expense_logged: { amount: 8, cap: 5 },
  budget_checkin: { amount: 5, cap: 1 },
  streak_day: { amount: 12, cap: 1 },
  streak_milestone: { amount: 0, cap: 99 }, // amount from milestone table
  under_budget_day: { amount: 10, cap: 3 },
  goal_contribute: { amount: 15, cap: 3 },
  debt_pay: { amount: 20, cap: 2 },
  story_viewed: { amount: 3, cap: 2 },
} as const;

export type XpReason = keyof typeof XP_RULES;

export const STREAK_MILESTONES: Record<number, number> = {
  7: 40,
  14: 80,
  30: 150,
};

export const LEVEL_THRESHOLDS = [
  { level: 1, name: "Semilla", xp: 0 },
  { level: 2, name: "Registro", xp: 100 },
  { level: 3, name: "Constante", xp: 300 },
  { level: 4, name: "En foco", xp: 700 },
  { level: 5, name: "Disciplina", xp: 1500 },
  { level: 6, name: "Brújula", xp: 3000 },
  { level: 7, name: "Reserva", xp: 5500 },
  { level: 8, name: "Balanza", xp: 9000 },
  { level: 9, name: "Farol", xp: 14000 },
  { level: 10, name: "Jera", xp: 22000 },
] as const;

export function levelFromXp(xp: number): {
  level: number;
  name: string;
  nextXp: number | null;
} {
  let current: (typeof LEVEL_THRESHOLDS)[number] = LEVEL_THRESHOLDS[0];
  for (const row of LEVEL_THRESHOLDS) {
    if (xp >= row.xp) current = row;
  }
  const next = LEVEL_THRESHOLDS.find((r) => r.level === current.level + 1);
  return {
    level: current.level,
    name: current.name,
    nextXp: next?.xp ?? null,
  };
}

export type HealthComponents = {
  budget: number;
  streak: number;
  goals: number;
  debts: number;
  logging: number;
};

export const HEALTH_WEIGHTS = {
  budget: 0.35,
  streak: 0.2,
  goals: 0.2,
  debts: 0.15,
  logging: 0.1,
} as const;

/** Each component 0–1 → score 0–100 */
export function computeHealthScore(c: HealthComponents): number {
  const raw =
    c.budget * HEALTH_WEIGHTS.budget +
    c.streak * HEALTH_WEIGHTS.streak +
    c.goals * HEALTH_WEIGHTS.goals +
    c.debts * HEALTH_WEIGHTS.debts +
    c.logging * HEALTH_WEIGHTS.logging;
  return Math.round(Math.min(100, Math.max(0, raw * 100)) * 100) / 100;
}

export function healthTone(score: number): "stable" | "attention" | "critical" {
  if (score >= 80) return "stable";
  if (score >= 50) return "attention";
  return "critical";
}

/** Local calendar date YYYY-MM-DD in an IANA timezone. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T12:00:00Z`);
  const db = Date.parse(`${b}T12:00:00Z`);
  return Math.round((db - da) / 86_400_000);
}

export type StreakState = {
  current_streak: number;
  longest_streak: number;
  last_qualified_on: string | null;
  freeze_tokens: number;
  milestones_claimed: number[];
};

/**
 * Pure streak transition for a qualifying action on `today`.
 * Returns null if already qualified today (no change to counters except event).
 */
export function applyStreakQualification(
  state: StreakState,
  today: string,
): {
  next: StreakState;
  newlyQualified: boolean;
  usedFreeze: boolean;
  broken: boolean;
  newMilestones: number[];
} {
  const last = state.last_qualified_on;
  if (last === today) {
    return {
      next: state,
      newlyQualified: false,
      usedFreeze: false,
      broken: false,
      newMilestones: [],
    };
  }

  let current = state.current_streak;
  let freeze = state.freeze_tokens;
  let usedFreeze = false;
  let broken = false;

  if (!last) {
    current = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap === 1) {
      current += 1;
    } else if (gap === 2 && freeze > 0) {
      // missed exactly one day — consume freeze, continue
      freeze -= 1;
      usedFreeze = true;
      current += 1;
    } else if (gap > 1) {
      broken = current > 0;
      current = 1;
    } else {
      // gap <= 0 (clock skew) — treat as same continuity
      current = Math.max(1, current);
    }
  }

  const milestones = [...(state.milestones_claimed ?? [])];
  const newMilestones: number[] = [];
  for (const m of Object.keys(STREAK_MILESTONES).map(Number)) {
    if (current >= m && !milestones.includes(m)) {
      milestones.push(m);
      newMilestones.push(m);
      if (m === 7 || m === 14 || m === 30) {
        freeze = Math.min(5, freeze + 1);
      }
    }
  }

  const next: StreakState = {
    current_streak: current,
    longest_streak: Math.max(state.longest_streak, current),
    last_qualified_on: today,
    freeze_tokens: freeze,
    milestones_claimed: milestones,
  };

  return { next, newlyQualified: true, usedFreeze, broken, newMilestones };
}
