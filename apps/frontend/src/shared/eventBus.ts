import mitt from "mitt";

type AppEvents = {
  "cart:item-added": { productName: string };
  "cart:item-removed": { productId: string };
  "order:placed": { orderId: string; orderNumber: string };
  "auth:session-expired": void;
};

// Singleton event bus — cross-feature communication without direct coupling.
// Hooks emit; components/providers subscribe.
export const eventBus = mitt<AppEvents>();
export type { AppEvents };
