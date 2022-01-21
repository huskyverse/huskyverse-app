import { BN } from "@project-serum/anchor";

export const toDecimalString = (amount: BN, decimal: number): string => {
  const s = amount.toString();

  if (decimal < 0) {
    throw Error(`negative decimal is not allowed: ${decimal}`);
  }

  if (decimal === 0) {
    return amount.toString();
  }

  if (amount.eq(new BN(0))) {
    return "0";
  }

  // "12345678", 8 -> "0.12345678"
  if (s.length === decimal) {
    return "0." + s;
  }

  // "1234", 8 -> "0.00001234"
  if (s.length < decimal) {
    return "0." + "0".repeat(decimal - s.length) + s;
  }

  return `${s.slice(0, s.length - decimal)}.${s.slice(s.length - decimal)}`;
};
