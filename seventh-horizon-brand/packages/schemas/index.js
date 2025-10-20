// Placeholder export for canonical schema defs.
// Real schemas can be JSON Schema objects imported here.
export const versions = { ui: "1.3.x", brand: "0.1.x" };
export const ThemeTokensSchema = {
  $id: "https://seventh-horizon.dev/schemas/theme-tokens.json",
  type: "object",
  properties: {
    meta: { type: "object" },
    colors: { type: "object" }
  },
  additionalProperties: true
};
