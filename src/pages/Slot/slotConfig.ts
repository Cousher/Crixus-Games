export type SlotSymbolKey =
  | "wild"
  | "yellow"
  | "hakkero"
  | "yin_yang"
  | "green"
  | "blue"
  | "red";

export type SymbolTier = "legendary" | "epic" | "rare" | "common";

export interface SlotSymbolSpec {
  key: SlotSymbolKey;
  img: string;
  es: string;
  en: string;
  mult: number;
  wild?: boolean;
  tier: SymbolTier;
  glow: string;
}

export const CELL_HEIGHT = 112;
export const REEL_VIEWPORT_HEIGHT = CELL_HEIGHT * 3; // 336px exact (0px drift)

export const SLOT_SYMBOLS: SlotSymbolSpec[] = [
  {
    key: "wild",
    img: "/images/slot/wild.webp",
    es: "León Dorado",
    en: "Golden Lion",
    mult: 100,
    wild: true,
    tier: "legendary",
    glow: "rgba(255, 215, 0, 0.9)",
  },
  {
    key: "yellow",
    img: "/images/slot/green.webp",
    es: "Áureo de César",
    en: "Caesar's Gold",
    mult: 25,
    tier: "legendary",
    glow: "rgba(255, 200, 60, 0.8)",
  },
  {
    key: "hakkero",
    img: "/images/slot/hakkero.webp",
    es: "Yelmo Imperial",
    en: "Imperial Helm",
    mult: 12,
    tier: "epic",
    glow: "rgba(245, 176, 56, 0.72)",
  },
  {
    key: "yin_yang",
    img: "/images/slot/yin.webp",
    es: "Espadas Gladius",
    en: "Gladius Blades",
    mult: 8,
    tier: "epic",
    glow: "rgba(255, 192, 68, 0.68)",
  },
  {
    key: "green",
    img: "/images/slot/lily.webp",
    es: "Esmeralda",
    en: "Emerald",
    mult: 3,
    tier: "rare",
    glow: "rgba(52, 211, 153, 0.68)",
  },
  {
    key: "blue",
    img: "/images/slot/shangai.webp",
    es: "Zafiro",
    en: "Sapphire",
    mult: 1,
    tier: "common",
    glow: "rgba(96, 165, 250, 0.65)",
  },
  {
    key: "red",
    img: "/images/slot/red.webp",
    es: "Rubí",
    en: "Ruby",
    mult: 0.5,
    tier: "common",
    glow: "rgba(248, 113, 113, 0.65)",
  },
];

export const SYMBOL_BY_KEY: Record<string, SlotSymbolSpec> = Object.fromEntries(
  SLOT_SYMBOLS.map((s) => [s.key, s])
);

export const SYMBOL_KEYS: SlotSymbolKey[] = SLOT_SYMBOLS.map((s) => s.key);

export interface PaylineSpec {
  id: string;
  num: number;
  cells: [number, number, number];
  /** Row index (0..2) in column 0, 1, 2 */
  rowsByCol: [number, number, number];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mid: [number, number];
  nodes: [number, number][];
  color: string;
}

export const PAYLINES: PaylineSpec[] = [
  {
    id: "Horizontal 1",
    num: 1,
    cells: [0, 1, 2],
    rowsByCol: [0, 0, 0],
    x1: 14,
    y1: 50,
    x2: 286,
    y2: 50,
    mid: [150, 50],
    nodes: [
      [50, 50],
      [150, 50],
      [250, 50],
    ],
    color: "#ffd966",
  },
  {
    id: "Horizontal 2",
    num: 2,
    cells: [3, 4, 5],
    rowsByCol: [1, 1, 1],
    x1: 14,
    y1: 150,
    x2: 286,
    y2: 150,
    mid: [150, 150],
    nodes: [
      [50, 150],
      [150, 150],
      [250, 150],
    ],
    color: "#ffbe3b",
  },
  {
    id: "Horizontal 3",
    num: 3,
    cells: [6, 7, 8],
    rowsByCol: [2, 2, 2],
    x1: 14,
    y1: 250,
    x2: 286,
    y2: 250,
    mid: [150, 250],
    nodes: [
      [50, 250],
      [150, 250],
      [250, 250],
    ],
    color: "#f59e0b",
  },
  {
    id: "Diagonal 1",
    num: 4,
    cells: [0, 4, 8],
    rowsByCol: [0, 1, 2],
    x1: 18,
    y1: 18,
    x2: 282,
    y2: 282,
    mid: [150, 150],
    nodes: [
      [50, 50],
      [150, 150],
      [250, 250],
    ],
    color: "#ffe896",
  },
  {
    id: "Diagonal 2",
    num: 5,
    cells: [6, 4, 2],
    rowsByCol: [2, 1, 0],
    x1: 18,
    y1: 282,
    x2: 282,
    y2: 18,
    mid: [150, 150],
    nodes: [
      [50, 250],
      [150, 150],
      [250, 50],
    ],
    color: "#ffb703",
  },
];

export const PAYLINE_BY_ID: Record<string, PaylineSpec> = Object.fromEntries(
  PAYLINES.map((p) => [p.id, p])
);

/**
 * Checks whether Reels 1 & 2 line up a high-value (>= 8x) or double-WILD potential win
 * on any of the 5 paylines so Reel 3 enters dramatic golden-lightning Anticipation Mode.
 */
export function detectReel3Anticipation(grid: string[]): {
  active: boolean;
  hotLines: string[];
  topMultiplier: number;
} {
  if (!grid || grid.length < 9) {
    return { active: false, hotLines: [], topMultiplier: 0 };
  }

  const hotLines: string[] = [];
  let topMultiplier = 0;

  for (const pl of PAYLINES) {
    const symA = grid[pl.cells[0]];
    const symB = grid[pl.cells[1]];
    if (!symA || !symB) continue;

    if (symA === symB || symA === "wild" || symB === "wild") {
      const mainSym = symA !== "wild" ? symA : symB !== "wild" ? symB : "wild";
      const mult = SYMBOL_BY_KEY[mainSym]?.mult ?? 0;
      if (mult >= 8) {
        hotLines.push(pl.id);
        if (mult > topMultiplier) topMultiplier = mult;
      }
    }
  }

  return { active: hotLines.length > 0, hotLines, topMultiplier };
}

export function getRandomSymbolKey(): SlotSymbolKey {
  // Weighted slightly toward visual variety while spinning
  return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
}

export function createInitialGrid(): SlotSymbolKey[] {
  // Curated regal opening grid so the cabinet looks inviting on first load
  return [
    "hakkero",
    "wild",
    "yellow",
    "yellow",
    "wild",
    "hakkero",
    "green",
    "yin_yang",
    "blue",
  ];
}
