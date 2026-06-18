import { productsHandlers } from "./products.handlers";
import { cartHandlers } from "./cart.handlers";
import { authHandlers } from "./auth.handlers";

export const handlers = [...productsHandlers, ...cartHandlers, ...authHandlers];
