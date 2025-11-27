import { WordItem } from '../types';

// Helper to escape CSV fields
const escapeCsvField = (field: string | undefined): string => {
  if (!field) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

export const wordsToCsv = (words: WordItem[]): string => {
  const header = ['id', 'english', 'chinese', 'example', 'createdAt'];
  const rows = words.map(w => [
    w.id,
    w.english,
    w.chinese,
    w.example || '',
    new Date(w.createdAt).toISOString()
  ].map(escapeCsvField).join(','));
  
  return [header.join(','), ...rows].join('\n');
};

export const csvToWords = (csvContent: string): WordItem[] => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Simple CSV parser that respects quotes
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuote) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          cur += char;
        }
      } else {
        if (char === '"') {
          inQuote = true;
        } else if (char === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += char;
        }
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  
  // Validate headers to ensure minimal compatibility
  const englishIdx = headers.indexOf('english');
  const chineseIdx = headers.indexOf('chinese');
  
  if (englishIdx === -1 || chineseIdx === -1) {
    throw new Error("CSV must contain 'english' and 'chinese' columns.");
  }

  const idIdx = headers.indexOf('id');
  const exampleIdx = headers.indexOf('example');
  const dateIdx = headers.indexOf('createdat');

  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    return {
      id: idIdx !== -1 && cols[idIdx] ? cols[idIdx] : crypto.randomUUID(),
      english: cols[englishIdx] || '',
      chinese: cols[chineseIdx] || '',
      example: exampleIdx !== -1 ? cols[exampleIdx] : '',
      createdAt: dateIdx !== -1 && cols[dateIdx] ? new Date(cols[dateIdx]).getTime() : Date.now(),
    };
  });
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
