export function formatPrice(
  price: number,
  locale = "en-US",
  options: Intl.NumberFormatOptions = {
    currency: "USD",
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
) {
  return new Intl.NumberFormat(locale, {
    ...options,
  }).format(price);
}
