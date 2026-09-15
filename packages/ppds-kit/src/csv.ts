/** Minimal RFC 4180 CSV parsing and serialisation (quoted fields, doubled quotes, CRLF). */

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${rows.map((row) => row.map(cell).join(',')).join('\n')}\n`;
}
