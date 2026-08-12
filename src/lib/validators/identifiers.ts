export type ValidationResult = { valid: boolean; normalized: string | null; error?: string };

export function validateISRC(isrc: string | null | undefined): ValidationResult {
  if (!isrc) return { valid: false, normalized: null, error: "ISRC vacío" };
  const normalized = String(isrc).toUpperCase().replace(/[^A-Z0-9]/g, "");
  // ISRC: 2 letters (country) + 3 alnum (registrant) + 2 digits (year) + 5 digits (designation) = 12 chars
  const ok = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(normalized);
  return ok
    ? { valid: true, normalized }
    : { valid: false, normalized, error: "Formato ISRC inválido" };
}

export function validateISWC(iswc: string | null | undefined): ValidationResult {
  if (!iswc) return { valid: false, normalized: null, error: "ISWC vacío" };
  const normalized = String(iswc).toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Expect form: T + 10 digits (9-digit body + 1 check digit) => total 11 chars
  if (!/^T\d{10}$/.test(normalized)) {
    return { valid: false, normalized, error: "Formato ISWC inválido" };
  }

  const digits = normalized.slice(1); // 10 digits
  const body = digits.slice(0, 9);
  const check = Number(digits[9]);
  let sum = 0;
  // weights: rightmost body digit *1 up to leftmost *9 -> equivalent to weight = 9 - i (i=0..8)
  for (let i = 0; i < 9; i++) {
    const d = Number(body[i]);
    const weight = 9 - i;
    sum += d * weight;
  }
  const r = sum % 10;
  const calc = (10 - r) % 10;
  if (calc === check) return { valid: true, normalized };
  return { valid: false, normalized, error: "Dígito de control ISWC inválido" };
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let doubleDigit = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (doubleDigit) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function validateIPI(ipi: string | null | undefined): ValidationResult {
  if (!ipi) return { valid: false, normalized: null, error: "IPI vacío" };
  const normalized = String(ipi).replace(/\D/g, "");
  if (!/^[0-9]{9,11}$/.test(normalized)) {
    return { valid: false, normalized, error: "IPI/CAE debe tener entre 9 y 11 dígitos" };
  }
  const ok = luhnCheck(normalized);
  return ok ? { valid: true, normalized } : { valid: false, normalized, error: "Dígito de control IPI inválido" };
}

export function validateUPC(upc: string | null | undefined): ValidationResult {
  if (!upc) return { valid: false, normalized: null, error: "UPC vacío" };
  const normalized = String(upc).replace(/\D/g, "");
  // Only implement UPC-A (12 digits) validation here
  if (!/^\d{12}$/.test(normalized)) {
    return { valid: false, normalized, error: "UPC-A debe tener 12 dígitos" };
  }
  const digits = normalized.split("").map((d) => Number(d));
  let sum = 0;
  // positions 1..11 (indexes 0..10)
  for (let i = 0; i <= 10; i++) {
    const pos = i + 1; // 1-based
    const weight = pos % 2 === 1 ? 3 : 1; // odd positions weight 3
    sum += digits[i] * weight;
  }
  const calc = (10 - (sum % 10)) % 10;
  const check = digits[11];
  if (calc === check) return { valid: true, normalized };
  return { valid: false, normalized, error: "Dígito de control UPC inválido" };
}
