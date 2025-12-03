import { SmartImportPlan, WordItem } from '../types';

export const formatImportSource = (date: Date = new Date()): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `import-${year}${month}${day}-${hour}${minute}`;
};

const parseDelimitedLine = (text: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  const delimiterLength = delimiter.length;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuote && i + 1 < text.length && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (!inQuote && delimiterLength > 0 && text.slice(i, i + delimiterLength) === delimiter) {
      result.push(current);
      current = '';
      i += delimiterLength - 1;
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const buildDelimitedRecords = (
  rawData: string,
  delimiter: string,
  hasHeader: boolean,
  skipRows: number = 0
): Record<string, unknown>[] => {
  const lines = rawData
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0);

  if (lines.length === 0) return [];

  const effectiveDelimiter = delimiter || ',';
  const headerIndex = Math.min(skipRows, lines.length - 1);
  let headers: string[] = [];
  let dataStart = skipRows;

  if (hasHeader) {
    headers = parseDelimitedLine(lines[headerIndex], effectiveDelimiter).map(header => header.trim());
    dataStart = headerIndex + 1;
  } else {
    const sample = parseDelimitedLine(lines[headerIndex], effectiveDelimiter);
    headers = sample.map((_, idx) => `column${idx + 1}`);
  }

  const records: Record<string, unknown>[] = [];

  for (let i = Math.max(dataStart, 0); i < lines.length; i++) {
    const cols = parseDelimitedLine(lines[i], effectiveDelimiter);
    const record: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      const value = cols[idx] !== undefined ? cols[idx] : '';
      record[header] = value;
      record[`column${idx + 1}`] = value;
      record[String(idx)] = value;
    });

    record.__parts = cols;
    records.push(record);
  }

  return records;
};

const getValueByPath = (input: unknown, path?: string): unknown => {
  if (!path) return '';

  const segments = path
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean);

  let current: unknown = input;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return '';
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return '';
      }
      current = current[index];
      continue;
    }

    if (typeof current === 'object') {
      const next = (current as Record<string, unknown>)[segment];
      current = next;
      continue;
    }

    return '';
  }

  return current ?? '';
};

const parseJsonRecords = (rawData: string, recordPath?: string): Record<string, unknown>[] => {
  try {
    const parsed = JSON.parse(rawData);
    let records: unknown = parsed;

    if (recordPath) {
      records = getValueByPath(parsed, recordPath);
    }

    if (Array.isArray(records)) {
      return records.filter(item => item && typeof item === 'object') as Record<string, unknown>[];
    }

    if (records && typeof records === 'object') {
      return [records as Record<string, unknown>];
    }
  } catch (error) {
    const lines = rawData
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const items: Record<string, unknown>[] = [];
    for (const line of lines) {
      try {
        const parsedLine = JSON.parse(line);
        if (parsedLine && typeof parsedLine === 'object') {
          items.push(parsedLine as Record<string, unknown>);
        }
      } catch {
        // Ignore malformed lines
      }
    }

    if (items.length > 0) {
      return items;
    }
  }

  return [];
};

const extractTagsAndMeaning = (raw: string | undefined): { tags?: string[]; meaning?: string } => {
  if (!raw) {
    return {};
  }

  const normalized = raw.trim();
  if (!normalized) {
    return {};
  }

  const cjkIndex = [...normalized].findIndex(char => /[\u4e00-\u9fff]/.test(char));
  let tagSegment = normalized;
  let meaningSegment: string | undefined;

  if (cjkIndex >= 0) {
    tagSegment = normalized.slice(0, cjkIndex).trim();
    meaningSegment = normalized.slice(cjkIndex).replace(/^[\s:：\.]+/, '').trim();
  }

  const cleanedTagSegment = tagSegment.replace(/[。．\.]+$/g, '').trim();
  let tags: string[] | undefined;

  if (cleanedTagSegment) {
    tags = cleanedTagSegment
      .split(/[\/;,，、\s]+/)
      .map(tag => tag.replace(/[。．\.]+$/g, '').trim())
      .filter(Boolean);
    if (tags.length === 0) {
      tags = undefined;
    }
  }

  return {
    tags,
    meaning: meaningSegment && meaningSegment.length > 0 ? meaningSegment : undefined
  };
};

const coerceToString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
};

export const applySmartImportPlan = (
  rawData: string,
  plan: SmartImportPlan,
  sourceLabel: string
): WordItem[] => {
  try {
    let records: Array<Record<string, unknown>> = [];

    switch (plan.format) {
      case 'csv':
        records = buildDelimitedRecords(rawData, ',', plan.hasHeader ?? true, plan.skipRows ?? 0);
        break;
      case 'tsv':
        records = buildDelimitedRecords(rawData, '\t', plan.hasHeader ?? true, plan.skipRows ?? 0);
        break;
      case 'text': {
        const delimiter = plan.delimiter || '\t';
        const lines = rawData
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);

        const expandSegments = (segment: string): string[] => {
          const trimmed = segment.trim();
          if (!trimmed) {
            return [''];
          }

          const firstCjkIndex = [...trimmed].findIndex(char => /[\u4e00-\u9fff]/.test(char));
          if (firstCjkIndex > 0) {
            const posPart = trimmed.slice(0, firstCjkIndex).replace(/[。．\.]+$/g, '').trim();
            const meaningPart = trimmed.slice(firstCjkIndex).replace(/^[\s:：\.]+/, '').trim();
            const result: string[] = [];
            if (posPart) {
              result.push(posPart);
            }
            if (meaningPart) {
              result.push(meaningPart);
            }
            if (result.length > 0) {
              return result;
            }
          }

          return [trimmed];
        };

        records = lines.map((line, idx) => {
          const rawParts = delimiter ? line.split(delimiter) : [line];
          const expandedParts: string[] = [];

          rawParts.forEach(part => {
            const segments = expandSegments(part);
            expandedParts.push(...segments);
          });

          if (expandedParts.length === 0) {
            expandedParts.push(line.trim());
          }

          const record: Record<string, unknown> = {};
          expandedParts.forEach((part, partIdx) => {
            record[`column${partIdx + 1}`] = part;
            record[String(partIdx)] = part;
          });
          record.__parts = expandedParts;
          record.__line = idx + 1;
          return record;
        });
        break;
      }
      case 'json':
      default:
        records = parseJsonRecords(rawData, plan.recordPath);
        break;
    }

    if (!records || records.length === 0) {
      return [];
    }

    const fieldMap = plan.fieldMap || {};
    const now = Date.now();

    const mapped = records
      .map((record, index) => {
        const englishRaw = getValueByPath(record, fieldMap.english);
        const chineseRaw = getValueByPath(record, fieldMap.chinese);
        const exampleRaw = getValueByPath(record, fieldMap.example);
        const tagsRaw = getValueByPath(record, fieldMap.tags);

        const english = coerceToString(englishRaw).trim();
        let chinese = coerceToString(chineseRaw).trim();
        const example = coerceToString(exampleRaw).trim();
        const tagsInfo = extractTagsAndMeaning(coerceToString(tagsRaw));
        let tags = tagsInfo.tags;

        const ensureTag = (tagCandidate?: string) => {
          const normalizedTag = (tagCandidate || '').trim();
          if (!normalizedTag) return;
          tags = tags ?? [];
          if (!tags.includes(normalizedTag)) {
            tags.push(normalizedTag);
          }
        };

        const containsCjk = (value: string) => /[\u4e00-\u9fff]/.test(value);

        if (tagsInfo.meaning && !chinese) {
          chinese = tagsInfo.meaning;
        }

        const partsArray = Array.isArray((record as any).__parts) ? ((record as any).__parts as unknown[]) : [];

        if (!chinese || !containsCjk(chinese)) {
          const fallback = partsArray.find((part) => {
            return (
              typeof part === 'string' &&
              containsCjk(part) &&
              part.trim().length > 0 &&
              part.trim() !== english
            );
          });

          if (typeof fallback === 'string') {
            if (chinese && !containsCjk(chinese)) {
              ensureTag(chinese);
            }
            chinese = fallback.trim();
          }
        }

        if ((!tags || tags.length === 0) && partsArray.length > 1) {
          const nonChineseParts = partsArray.filter(part => {
            return (
              typeof part === 'string' &&
              !containsCjk(part) &&
              part.trim().length > 0 &&
              part.trim() !== english
            );
          }) as string[];

          nonChineseParts.forEach(candidate => ensureTag(candidate));
        }

        if (!english) {
          return null;
        }

        const word: WordItem = {
          id: crypto.randomUUID(),
          english,
          chinese,
          example: example || undefined,
          tags,
          isMastered: 0,
          createdAt: now + index,
          source: sourceLabel
        };

        return word;
      })
      .filter((word): word is WordItem => Boolean(word));

    return mapped;
  } catch (error) {
    console.error('Smart import conversion failed:', error);
    return [];
  }
};
