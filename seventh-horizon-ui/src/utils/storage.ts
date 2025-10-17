import type { Theme } from '../types';

// ✅ DEFINE AND EXPORT the constant from this file.
export const STORAGE_KEYS = {
  theme: 'sh_theme',
  csvPath: 'sh_csvPath',
  hiddenCols: 'sh_hiddenCols',
  columnOrder: 'sh_columnOrder',
  sortKeys: 'sh_sortKeys',
  // Add other keys as needed
};

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage', e);
  }
}

export function loadTheme(): Theme | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
  } catch (e) {
    console.warn('Failed to load theme from localStorage', e);
    return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Failed to copy to clipboard:', err);
    // Fallback for older browsers or insecure contexts
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error('Clipboard fallback failed:', fallbackErr);
      return false;
    }
  }
}
