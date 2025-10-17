import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveTheme, loadTheme, copyToClipboard } from '../storage';

describe('storage.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    if (!(navigator as any).clipboard) {
      (navigator as any).clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    } else {
      (navigator as any).clipboard.writeText = vi.fn().mockResolvedValue(undefined);
    }
    vi.restoreAllMocks();
  });

  it('exports the expected functions', () => {
    expect(saveTheme).toBeTypeOf('function');
    expect(loadTheme).toBeTypeOf('function');
    expect(copyToClipboard).toBeTypeOf('function');
  });

  it('saveTheme + loadTheme round-trip works', () => {
    const theme = 'rose';
    saveTheme(theme as any);
    const loaded = loadTheme();
    expect(loaded).toBe(theme);
  });

  it('copyToClipboard calls navigator.clipboard.writeText', async () => {
    const text = 'hello world';
    const writeText = vi.spyOn((navigator as any).clipboard, 'writeText').mockResolvedValue(undefined);
    await copyToClipboard(text);
    expect(writeText).toHaveBeenCalledWith(text);
  });
});

