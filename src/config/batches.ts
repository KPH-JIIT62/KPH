// The branch can be guessed from the first letter of the batch (B11 -> B -> CSE).
// ONLY the letters listed here are suggested; for any other letter the person picks their branch themselves.
// Add the remaining letters here as they are confirmed, e.g.  F: "ECE".
export const BATCH_BRANCHES: Record<string, string> = {
  B: "CSE",
  D: "R&AI",
};

export function branchFromBatch(batch: string): string | null {
  return BATCH_BRANCHES[batch.trim().charAt(0).toUpperCase()] ?? null;
}
