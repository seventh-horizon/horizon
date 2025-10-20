/**
 * Adapt DreamB rich tokens (v1.3.x) to the flat UI var map expected by applyThemeTokens.
 * NOTE: This does NOT import or run anywhere yet—it's prep only.
 */
type DreamB = {
  brand?: Record<string, any>;
  motion?: { signal_hue_deg?: number; resonance_gain?: number };
  focus?: { rose1_hsl?: [number, number, number]; rose2_hsl?: [number, number, number] };
};
export type UiTokenBag = Record<string, string | number>;

const toHslStr = (t?: [number, number, number]) =>
  t ? `${t[0]} ${t[1]}% ${t[2]}%` : undefined;

export function adaptDreamBToUi(tokens: DreamB): UiTokenBag {
  const out: UiTokenBag = {};
  const b = tokens?.brand || {};
  const rgb = (k: string) => (Array.isArray(b[k]?.rgb) ? b[k].rgb.join(", ") : undefined);
  const set = (k: string, v: any) => { if (v != null) out[k] = v; };

  set("brand.cyan.rgb",     rgb("cyan"));
  set("brand.violet.rgb",   rgb("violet"));
  set("brand.magenta.rgb",  rgb("magenta"));
  set("brand.navy.rgb",     rgb("navy"));
  set("motion.signal.hue",  tokens?.motion?.signal_hue_deg);
  set("motion.resonance",   tokens?.motion?.resonance_gain);
  set("focus.rose1.hsl",    toHslStr(tokens?.focus?.rose1_hsl));
  set("focus.rose2.hsl",    toHslStr(tokens?.focus?.rose2_hsl));

  return out;
}
