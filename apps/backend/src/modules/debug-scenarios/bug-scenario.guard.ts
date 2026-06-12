/*
 - Returns true when the BUG_SCENARIO env var matches the given scenario number.
 - Used to toggle artificial observability debug scenarios on/off.
 - Usage: if (isBugScenario(1)) { ... broken code ... }
*/
export function isBugScenario(n: number): boolean {
  return process.env.BUG_SCENARIO === String(n);
}
