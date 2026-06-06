export interface CsvRow {
  name: string;
  slug: string;
  price: string;
  cost: string;
  stock: string;
  categoryId: string;
  description?: string;
}

export interface WorkerError {
  row: number;
  field: string;
  message: string;
}

export interface WorkerResult {
  validRows: CsvRow[];
  errors: WorkerError[];
  skipped: number;
}
