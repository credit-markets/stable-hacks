export function formatAddress(
  address: string,
  { from, to }: { from: number; to: number } = { from: 6, to: -4 },
): string {
  return `${address.slice(0, from)}...${address.slice(to)}`;
}
