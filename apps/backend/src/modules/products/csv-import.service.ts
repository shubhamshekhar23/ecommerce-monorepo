import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { PrismaService } from '@/modules/prisma/prisma.service';
import type { CsvRow, WorkerResult } from './workers/csv-worker.types';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

// Stream processing pattern: csv-parse streams the buffer row-by-row inside a worker thread.
// Parse + validation are CPU-bound and run off the main event loop. DB writes (I/O-bound)
// stay on the main thread — Prisma connections cannot cross thread boundaries.
//
// Buffer transfer: buffer.buffer.slice(...) produces a detached ArrayBuffer sent zero-copy
// via transferList. The worker owns the memory; the main thread cannot read it after transfer.

const BATCH_SIZE = 100;
const WORKER_PATH = path.join(__dirname, 'workers', 'csv-parser.worker.js');

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProducts(buffer: Buffer): Promise<ImportResult> {
    const { validRows, errors, skipped } = await this.runWorker(buffer);
    const result: ImportResult = { imported: 0, skipped, errors };

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      await this.writeBatch(batch);
      result.imported += batch.length;
    }

    return result;
  }

  private runWorker(buffer: Buffer): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const arrayBuffer = (buffer.buffer as ArrayBuffer).slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      const worker = new Worker(WORKER_PATH, {
        workerData: { buffer: arrayBuffer },
        transferList: [arrayBuffer],
      });
      worker.on('message', (result: WorkerResult) => resolve(result));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`CSV worker exited with code ${code}`));
      });
    });
  }

  private async writeBatch(rows: CsvRow[]): Promise<void> {
    for (const row of rows) {
      await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.upsert({
          where: { slug: row.slug },
          create: {
            id: crypto.randomUUID(),
            name: row.name,
            slug: row.slug,
            categoryId: row.categoryId,
          },
          update: {
            name: row.name,
          },
        });

        await tx.productDetail.upsert({
          where: { productId: product.id },
          create: { productId: product.id, description: row.description ?? null },
          update: { description: row.description ?? null },
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
