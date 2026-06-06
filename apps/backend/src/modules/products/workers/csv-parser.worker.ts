import { workerData, parentPort } from 'worker_threads';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import type { CsvRow, WorkerError, WorkerResult } from './csv-worker.types';

const REQUIRED_FIELDS: (keyof CsvRow)[] = ['name', 'slug', 'price', 'cost', 'stock', 'categoryId'];

function validateRow(row: CsvRow, lineNumber: number): WorkerError[] {
  const errors: WorkerError[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!row[field]) {
      errors.push({ row: lineNumber, field, message: `${field} is required` });
    }
  }
  if (row.price && isNaN(parseFloat(row.price))) {
    errors.push({ row: lineNumber, field: 'price', message: 'price must be a number' });
  }
  if (row.stock && isNaN(parseInt(row.stock, 10))) {
    errors.push({ row: lineNumber, field: 'stock', message: 'stock must be an integer' });
  }

  return errors;
}

function parseAndValidate(buffer: Buffer): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const result: WorkerResult = { validRows: [], errors: [], skipped: 0 };
    let lineNumber = 0;

    Readable.from(buffer)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row: CsvRow) => {
        lineNumber++;
        const rowErrors = validateRow(row, lineNumber);
        if (rowErrors.length > 0) {
          result.errors.push(...rowErrors);
          result.skipped++;
        } else {
          result.validRows.push(row);
        }
      })
      .on('end', () => resolve(result))
      .on('error', reject);
  });
}

// workerData.buffer is an ArrayBuffer transferred zero-copy from the main thread.
// We wrap it in a Buffer so the stream and csv-parse APIs can consume it.
const input = workerData as { buffer: ArrayBuffer };
const nodeBuffer = Buffer.from(input.buffer);

parseAndValidate(nodeBuffer)
  .then((result) => parentPort!.postMessage(result))
  .catch((err: unknown) => {
    throw err;
  });
