import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readInitialTheme, saveTheme, loadUIState, saveUIState, copyToClipboard } from '../storage';
import { STORAGE_KEYS } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('readInitialTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return saved theme from localStorage', () => {
    localStorageMock.setItem(STORAGE_KEYS.THEME, 'rose');
    expect(readInitialTheme()).toBe('rose');
  });

  it('should return veil for dark mode preference when no saved theme', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
    })) as typeof window.matchMedia;

    expect(readInitialTheme()).toBe('veil');
  });

  it('should return rose for light mode preference when no saved theme', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
    })) as typeof window.matchMedia;

    expect(readInitialTheme()).toBe('rose');
  });
});

describe('saveTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    delete document.documentElement.dataset.theme;
  });

  it('should save theme to localStorage', () => {
    saveTheme('veil');
    expect(localStorageMock.getItem(STORAGE_KEYS.THEME)).toBe('veil');
  });

  it('should apply theme to document element', () => {
    saveTheme('rose');
    expect(document.documentElement.dataset.theme).toBe('rose');
  });
});

describe('loadUIState', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return null when no state saved', () => {
    expect(loadUIState()).toBeNull();
  });

  it('should return parsed state', () => {
    const state = { csvPath: '/test.csv', wrap: true };
    localStorageMock.setItem(STORAGE_KEYS.UI, JSON.stringify(state));
    expect(loadUIState()).toEqual(state);
  });

  it('should return null on parse error', () => {
    localStorageMock.setItem(STORAGE_KEYS.UI, 'invalid json');
    expect(loadUIState()).toBeNull();
  });
});

describe('saveUIState', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save state to localStorage', () => {
    const state = { csvPath: '/test.csv', wrap: true };
    saveUIState(state);
    expect(localStorageMock.getItem(STORAGE_KEYS.UI)).toBe(JSON.stringify(state));
  });

  it('should handle save errors gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock setItem to throw
    vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    expect(() => saveUIState({ csvPath: '/test.csv' })).not.toThrow();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('copyToClipboard', () => {
  it('should return true on successful copy', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const result = await copyToClipboard('test');
    expect(result).toBe(true);
  });

  it('should return false on copy failure', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Failed')),
      },
    });

    const result = await copyToClipboard('test');
    expect(result).toBe(false);
  });
});
