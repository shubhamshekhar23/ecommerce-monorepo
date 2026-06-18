export function formatAdminPrice(price: number | string): string {
  return `$${Number(price).toFixed(2)}`;
}

export function formatAdminDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}
