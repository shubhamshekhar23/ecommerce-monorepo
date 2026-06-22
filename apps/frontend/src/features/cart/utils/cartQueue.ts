import { openDB } from "idb";

const DB_NAME = "shophub-offline";
const STORE_NAME = "cart-queue";
const DB_VERSION = 1;

export interface CartQueueItem {
  id: string;
  action: "ADD" | "REMOVE" | "UPDATE";
  payload: { productId: string; quantity: number; cartItemId?: string };
  timestamp: number;
}

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    },
  });
}

export async function enqueueCartMutation(
  item: Omit<CartQueueItem, "id" | "timestamp">,
): Promise<void> {
  const db = await getDb();
  await db.add(STORE_NAME, {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}

export async function getCartQueue(): Promise<CartQueueItem[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function removeCartQueueItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
