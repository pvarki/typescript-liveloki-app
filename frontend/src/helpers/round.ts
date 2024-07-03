export function round(val: number, decimals: number): number {
  const q = 10 ** decimals;
  return Math.round(val * q) / q;
}
