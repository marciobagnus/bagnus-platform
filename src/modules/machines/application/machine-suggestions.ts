export type MachineSuggestions = { brands: string[]; types: string[]; models: string[] };

export function normalizeMachineSuggestions(values: readonly (string | null)[]): string[] {
  const sorted = values.map((value) => value?.trim() ?? "").filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  const seen = new Set<string>();
  return sorted.filter((value) => {
    const key = value.toLocaleLowerCase("es");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 200);
}
