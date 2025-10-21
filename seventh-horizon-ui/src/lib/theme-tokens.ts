/**
 * Apply nested UI tokens to CSS variables on :root.
 * Works with manifests like theme_tokens_v1.3.2.json.
 */
export type TokenBag = {
  colors?: Record<string, string | number>;
  motion?: Record<string, string | number | boolean>;
  [key: string]: any;
};

const MAP: Record<string, string> = {
  "colors.brand.cyan.rgb": "--tint-cyan",
  "colors.brand.violet.rgb": "--tint-violet",
  "colors.brand.magenta.rgb": "--tint-magenta",
  "colors.brand.navy.rgb": "--tint-navy",
  "motion.signal.hue": "--signal-hue",
  "motion.resonance": "--resonance-alpha",
  "colors.focus.rose1.hsl": "--rose-accent-1",
  "colors.focus.rose2.hsl": "--rose-accent-2"
};

export function applyThemeTokens(tokens: TokenBag) {
  const root = document.documentElement;

  for (const [path, cssVar] of Object.entries(MAP)) {
    const parts = path.split(".");
    let value: any = tokens;
    for (const p of parts) value = value?.[p];
    if (value != null) root.style.setProperty(cssVar, String(value));
  }

  const motionEnabled = !!tokens.motion?.enabled;
  root.dataset.motionEnabled = motionEnabled ? "true" : "false";
  root.dataset.focusEnabled = "true";
}
