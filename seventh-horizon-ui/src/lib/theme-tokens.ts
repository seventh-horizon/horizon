/**
 * Apply flattened UI tokens to CSS variables on :root.
 * This file is prep only; nothing imports it at runtime yet.
 */
export type TokenBag = Record<string, string | number>;
const MAP: Record<string, string> = {
  "brand.cyan.rgb":    "--tint-cyan",
  "brand.violet.rgb":  "--tint-violet",
  "brand.magenta.rgb": "--tint-magenta",
  "brand.navy.rgb":    "--tint-navy",
  "motion.signal.hue": "--signal-hue",
  "motion.resonance":  "--resonance-alpha",
  "focus.rose1.hsl":   "--rose-accent-1",
  "focus.rose2.hsl":   "--rose-accent-2",
};
export function applyThemeTokens(tokens: TokenBag) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(MAP)) {
    if (tokens[key] != null) root.style.setProperty(cssVar, String(tokens[key]));
  }
}
