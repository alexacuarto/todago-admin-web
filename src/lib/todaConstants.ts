export const OFFICIAL_TODAS = [
  "BYPASS ILAYANG BAGUIO-TODA",
  "CHOT-TODA",
  "LHITC-TODA",
] as const;

export type OfficialToda = (typeof OFFICIAL_TODAS)[number];

export function normalizeToda(val: string | null | undefined): OfficialToda | null {
  if (!val) return null;
  const clean = val.trim().toUpperCase();
  if (clean.includes("BYPASS") || clean.includes("BAGUIO")) {
    return "BYPASS ILAYANG BAGUIO-TODA";
  }
  if (clean.includes("CHOT")) {
    return "CHOT-TODA";
  }
  if (clean.includes("LHITC")) {
    return "LHITC-TODA";
  }
  return null;
}
