import { describe, it, expect } from 'vitest';
import { parseCSV, parseTags, escapeCSVCell, rowsToCSV, validateCSV, isProbablyHTML } from '../csv';

describe('parseCSV', () => {
  it('should parse simple CSV', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  it('should handle quoted commas', () => {
    const csv = '"a,b",c\n1,2';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a,b', 'c'],
      ['1', '2'],
    ]);
  });

  it('should handle escaped quotes', () => {
    const csv = '"a""b",c\n1,2';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a"b', 'c'],
      ['1', '2'],
    ]);
  });

  it('should handle empty cells', () => {
    const csv = 'a,,c\n,2,';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a', '', 'c'],
      ['', '2', ''],
    ]);
  });

  it('should handle CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('should filter out completely empty rows', () => {
    const csv = 'a,b\n\n1,2';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('should handle trailing newline', () => {
    const csv = 'a,b\n1,2\n';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseTags', () => {
  it('should parse comma-separated tags', () => {
    expect(parseTags('tag1,tag2,tag3')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should parse semicolon-separated tags', () => {
    expect(parseTags('tag1;tag2;tag3')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should parse pipe-separated tags', () => {
    expect(parseTags('tag1|tag2|tag3')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should trim whitespace', () => {
    expect(parseTags('tag1 , tag2 , tag3')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should filter empty tags', () => {
    expect(parseTags('tag1,,tag3')).toEqual(['tag1', 'tag3']);
  });

  it('should handle undefined', () => {
    expect(parseTags(undefined)).toEqual([]);
  });

  it('should handle empty string', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('escapeCSVCell', () => {
  it('should not escape simple values', () => {
    expect(escapeCSVCell('hello')).toBe('hello');
    expect(escapeCSVCell('123')).toBe('123');
  });

  it('should escape values with commas', () => {
    expect(escapeCSVCell('hello,world')).toBe('"hello,world"');
  });

  it('should escape values with quotes', () => {
    expect(escapeCSVCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('should escape values with newlines', () => {
    expect(escapeCSVCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should handle null and undefined', () => {
    expect(escapeCSVCell(null)).toBe('');
    expect(escapeCSVCell(undefined)).toBe('');
  });

  it('should convert numbers to strings', () => {
    expect(escapeCSVCell(123)).toBe('123');
  });
});

describe('rowsToCSV', () => {
  it('should convert rows to CSV', () => {
    const header = ['a', 'b', 'c'];
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ];
    const result = rowsToCSV(header, rows);
    expect(result).toBe('a,b,c\n1,2,3\n4,5,6');
  });

  it('should escape special characters', () => {
    const header = ['name', 'value'];
    const rows = [['hello,world', 'test']];
    const result = rowsToCSV(header, rows);
    expect(result).toBe('name,value\n"hello,world",test');
  });
});

describe('validateCSV', () => {
  it('should pass valid CSV', () => {
    const rows = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ];
    const issues = validateCSV(rows);
    expect(issues).toEqual([]);
  });

  it('should detect too few rows', () => {
    const rows = [['a', 'b', 'c']];
    const issues = validateCSV(rows);
    expect(issues).toContain('CSV must have at least a header and one data row');
  });

  it('should detect inconsistent column counts', () => {
    const rows = [
      ['a', 'b', 'c'],
      ['1', '2'],
      ['4', '5', '6'],
    ];
    const issues = validateCSV(rows);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('Row 1');
  });
});

describe('isProbablyHTML', () => {
  it('should detect HTML DOCTYPE', () => {
    expect(isProbablyHTML('<!DOCTYPE html><html>')).toBe(true);
    expect(isProbablyHTML('<!doctype html><html>')).toBe(true);
  });

  it('should detect HTML tag', () => {
    expect(isProbablyHTML('<html><head>')).toBe(true);
  });

  it('should not detect CSV as HTML', () => {
    expect(isProbablyHTML('a,b,c\n1,2,3')).toBe(false);
  });

  it('should handle leading whitespace', () => {
    expect(isProbablyHTML('  <!DOCTYPE html>')).toBe(true);
  });
});
