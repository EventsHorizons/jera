/**
 * Gramática semántica de iconos — una intención, un icono.
 * Usar siempre con contexto (objeto + ubicación) en aria-label.
 */
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  Eye,
  Filter,
  Home,
  Info,
  Pause,
  Pencil,
  PiggyBank,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

export const ActionIcons = {
  nav: {
    home: Home,
    back: ArrowLeftRight,
    close: X,
  },
  create: {
    add: Plus,
  },
  edit: {
    pencil: Pencil,
  },
  destroy: {
    trash: Trash2,
  },
  finance: {
    account: Wallet,
    income: ArrowDownLeft,
    expense: ArrowUpRight,
    transfer: ArrowLeftRight,
    payment: Banknote,
    movement: Receipt,
    goal: Target,
    contribute: PiggyBank,
    budget: SlidersHorizontal,
  },
  state: {
    archive: Archive,
    restore: RotateCcw,
    pause: Pause,
    resume: Play,
    view: Eye,
  },
  utility: {
    search: Search,
    filter: Filter,
    settings: Settings,
    info: Info,
    calendar: Calendar,
  },
} as const satisfies Record<string, Record<string, LucideIcon>>;

export type ActionIconIntent = keyof typeof ActionIcons;

/** Etiquetas cortas recomendadas por intención (combinar con objeto). */
export function actionLabel(
  verb: string,
  object?: string,
): string {
  return object ? `${verb} ${object}` : verb;
}
