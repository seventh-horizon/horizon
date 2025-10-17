/**
 * Parse CSV text into a 2D array of strings.
 * Handles commas inside quotes and escaped quotes.
 * 
 * @param text - The CSV text to parse
 * @returns A 2D array of strings representing rows and cells
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let q = false; // in quotes

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        q = true;
      } else if (c === ',') {
        cur.push(cell);
        cell = '';
      } else if (c === '\n') {
        cur.push(cell);
        rows.push(cur);
        cur = [];
        cell = '';
      } else if (c === '\r') {
        // ignore carriage returns
      } else {
        cell += c;
      }
    }
  }
  
  if (cell.length || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ''));
}

/**
 * Check if text looks like HTML instead of CSV
 */
export function isProbablyHTML(text: string): boolean {
  const s = text.trim().slice(0, 200).toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html');
}

/**
 * Parse tags from a cell value
 */
export function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  
  return value
    .split(/[;|,]/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * Escape CSV cell value
 */
export function escapeCSVCell(value: unknown): string {
  const v = value ?? '';
  const str = String(v);
  
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}

/**
 * Convert rows to CSV text
 */
export function rowsToCSV(header: string[], rows: string[][]): string {
  const allRows = [header, ...rows];
  return allRows
    .map(row => row.map(escapeCSVCell).join(','))
    .join('\n');
}

/**
 * Validate CSV structure
 */
export function validateCSV(rows: string[][]): string[] {
  const issues: string[] = [];
  
  if (rows.length < 2) {
    issues.push('CSV must have at least a header and one data row');
    return issues;
  }
  
  const colCount = rows[0]?.length ?? 0;
  
  rows.forEach((row, i) => {
    if (row.length !== colCount) {
      issues.push(`Row ${i} has ${row.length} columns, expected ${colCount}`);
    }
  });
  
  return issues;
}
