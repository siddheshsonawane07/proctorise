/**
 * A CSV a teacher opens in a spreadsheet. A cell starting with =, +, -, @, tab or carriage return
 * would run as a formula (a student named "=HYPERLINK(...)"), so it gets a leading ' (Phase-9-Critic #4).
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = value === null || value === undefined ? "" : String(value);
          if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
