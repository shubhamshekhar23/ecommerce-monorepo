import { join } from 'path';

export const INVOICES_DIR = 'uploads/invoices';

export function getInvoicePath(orderId: string): string {
  return join(INVOICES_DIR, `invoice-${orderId}.pdf`);
}
