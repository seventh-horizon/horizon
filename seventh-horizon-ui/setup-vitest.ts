// Vitest-only matcher setup
// IMPORTANT: never import this from Playwright or app runtime.
import '@testing-library/jest-dom/vitest';
// If you extend expect manually, do it here — not in shared app code.
// e.g. expect.extend(customMatchers)