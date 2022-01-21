import { BN } from "@project-serum/anchor";
import { toDecimalString } from "./format";
describe("#toDecimalString", () => {
  test("0 BN must always return '0'", () => {
    expect(toDecimalString(new BN(0), 0)).toBe("0");
    expect(toDecimalString(new BN(0), 1)).toBe("0");
    expect(toDecimalString(new BN(0), 2)).toBe("0");
  });

  test("return exact number when decimal is 0", () => {
    expect(toDecimalString(new BN(1), 0)).toBe("1");
    expect(toDecimalString(new BN(2934), 0)).toBe("2934");
  });

  test("BN digits eq decimal places should return 0.<BN>", () => {
    expect(toDecimalString(new BN(1), 1)).toBe("0.1");
    expect(toDecimalString(new BN(99), 2)).toBe("0.99");
    expect(toDecimalString(new BN(69696969), 8)).toBe("0.69696969");
  });

  test("BN digits lt decimal places should pad decimal places by the diff of digits and decimal places", () => {
    expect(toDecimalString(new BN(1), 2)).toBe("0.01");
    expect(toDecimalString(new BN(1), 3)).toBe("0.001");
    expect(toDecimalString(new BN(12), 3)).toBe("0.012");
    expect(toDecimalString(new BN(999), 4)).toBe("0.0999");
  });

  test("BN digits gt decimal places should return masked", () => {
    expect(toDecimalString(new BN(100), 2)).toBe("1.00");
    expect(toDecimalString(new BN(69999), 3)).toBe("69.999");
  });

  test("decimal can't be negative", () => {
    expect(() => {
      toDecimalString(new BN(1), -1);
    }).toThrow("negative decimal is not allowed: -1");

    expect(() => {
      toDecimalString(new BN(23094234), -10);
    }).toThrow("negative decimal is not allowed: -10");
  });
});
