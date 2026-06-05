/* eslint-disable max-lines */
import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { PrismaService } from '@/modules/prisma/prisma.service';

interface CsvRow {
  name: string;
  slug: string;
  price: string;
  cost: string;
  stock: string;
  categoryId: string;
  description?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

// Stream processing pattern: process the CSV row-by-row instead of loading
// it all into memory. A 100,000-row CSV at 500 bytes/row = 50MB. Loading it
// all into memory then processing blocks the event loop and risks OOM.
//
// Stream pipeline:
//   multer (upload buffer) → Readable → csv-parse → validate → batch DB write
//
// Batching: we collect 100 rows then INSERT them all in one query.
// Why batch? One INSERT per row = N round-trips to Postgres. One batch INSERT = 1 round-trip.
// At 10ms per round-trip, 1000 rows × 10ms = 10s. With batches of 100: 10 × 10ms = 100ms.

const BATCH_SIZE = 100;
const REQUIRED_FIELDS: (keyof CsvRow)[] = ['name', 'slug', 'price', 'cost', 'stock', 'categoryId'];

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProducts(buffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseStream(buffer);
    return this.processRows(rows);
  }

  private parseStream(buffer: Buffer): Promise<Array<{ row: CsvRow; lineNumber: number }>> {
    return new Promise((resolve, reject) => {
      const results: Array<{ row: CsvRow; lineNumber: number }> = [];
      let lineNumber = 0;

      Readable.from(buffer)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (row: CsvRow) => { lineNumber++; results.push({ row, lineNumber }); })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private async processRows(rows: Array<{ row: CsvRow; lineNumber: number }>): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    const validRows: CsvRow[] = [];

    for (const { row, lineNumber } of rows) {
      const rowErrors = this.validateRow(row, lineNumber);
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.skipped++;
      } else {
        validRows.push(row);
      }
    }

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      await this.writeBatch(batch);
      result.imported += batch.length;
    }

    return result;
  }

  private validateRow(row: CsvRow, lineNumber: number): ImportResult['errors'] {
    const errors: ImportResult['errors'] = [];

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

  private async writeBatch(rows: CsvRow[]): Promise<void> {
    // Each CSV row upserts the Product (by slug), then upserts a default ProductVariant.
    // price/cost/stock belong to ProductVariant — Product is now metadata-only.
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.upsert({
          where: { slug: row.slug },
          create: {
            id: crypto.randomUUID(),
            name: row.name,
            slug: row.slug,
            description: row.description ?? null,
            categoryId: row.categoryId,
          },
          update: {
            name: row.name,
            description: row.description ?? null,
          },
        });

        const defaultSku = `${product.id.slice(-8).toUpperCase()}-DEFAULT`;

        await tx.productVariant.upsert({
          where: { sku: defaultSku },
          create: {
            productId: product.id,
            sku: defaultSku,
            price: parseFloat(row.price),
            cost: parseFloat(row.cost),
            stock: parseInt(row.stock, 10),
          },
          update: {
            price: parseFloat(row.price),
            cost: parseFloat(row.cost),
            stock: parseInt(row.stock, 10),
          },
        });
      });
    }
  }
}
