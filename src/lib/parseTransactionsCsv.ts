// Minimal CSV parser for bank-statement style transaction uploads.
// Expected header: date,description,amount,type
//   date: YYYY-MM-DD
//   amount: positive number (magnitude only; sign is derived from type)
//   type: income | expense (case-insensitive)
// No quoted-field/escaping support — deliberately simple for a fixed,
// documented column format rather than a general-purpose CSV library.

export interface ParsedTransactionRow {
  transaction_date: string;
  merchant_name: string;
  amount: number;
  type: "income" | "expense";
}

export interface ParseTransactionsCsvResult {
  rows: ParsedTransactionRow[];
  errors: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTransactionsCsv(csvText: string): ParseTransactionsCsvResult {
  const rows: ParsedTransactionRow[] = [];
  const errors: string[] = [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows, errors: ["File CSV trống"] };
  }

  const header = lines[0].toLowerCase();
  const startIndex = header.startsWith("date,") || header.includes("date,description") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cols = lines[i].split(",").map((c) => c.trim());

    if (cols.length < 4) {
      errors.push(`Dòng ${lineNumber}: thiếu cột (cần date,description,amount,type)`);
      continue;
    }

    const [date, description, amountStr, typeStr] = cols;

    if (!DATE_RE.test(date)) {
      errors.push(`Dòng ${lineNumber}: ngày không hợp lệ "${date}" (định dạng YYYY-MM-DD)`);
      continue;
    }

    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Dòng ${lineNumber}: số tiền không hợp lệ "${amountStr}"`);
      continue;
    }

    const type = typeStr.toLowerCase();
    if (type !== "income" && type !== "expense") {
      errors.push(`Dòng ${lineNumber}: loại giao dịch không hợp lệ "${typeStr}" (income|expense)`);
      continue;
    }

    rows.push({
      transaction_date: date,
      merchant_name: description || "Không rõ",
      amount: type === "income" ? amount : -amount,
      type,
    });
  }

  return { rows, errors };
}
