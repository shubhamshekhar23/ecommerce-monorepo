// Cart UI state machine — tracks local UI transitions separate from server state.
// Server state (actual cart data) lives in TanStack Query.
// This reducer owns transitions that are purely UI concerns: confirmation dialogs,
// per-item pending flags, etc.

export type CartUiState = {
  // 'browsing'        — normal state
  // 'confirming-clear'— user clicked "Clear Cart", waiting for confirm/cancel
  phase: "browsing" | "confirming-clear";
};

export type CartUiAction =
  | { type: "REQUEST_CLEAR" }
  | { type: "CANCEL" }
  | { type: "CONFIRM_CLEAR" };

export function cartUiReducer(
  state: CartUiState,
  action: CartUiAction,
): CartUiState {
  switch (action.type) {
    case "REQUEST_CLEAR":
      return { phase: "confirming-clear" };
    case "CANCEL":
      return { phase: "browsing" };
    case "CONFIRM_CLEAR":
      return { phase: "browsing" };
    default:
      return state;
  }
}

export const cartUiInitialState: CartUiState = { phase: "browsing" };
