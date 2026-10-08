// The rules that turn a batch into a branch (and which batches exist on which campus) live in ONE place: the backend,
// Backend/src/config/academic.js. The API sends this person's valid batches in `profile.academic.batchBranches`, so the
// form can give instant feedback without a second copy of the rules that could drift out of date.
// The server re-checks everything when the form is saved; nothing here is trusted.
export const SUPPORT_EMAIL = "kph.jiit@gmail.com";

export type BatchCheck =
  | { status: "empty" }
  | { status: "unavailable" } // nothing to check against yet (enrollment number not known / not recognised)
  | { status: "invalid"; message: string }
  | { status: "ok"; branch: string };

// "b11" -> { status: "ok", branch: "CSE" } when B is a CSE batch on this person's campus.
export function detectBranch(batch: string, batchBranches: Record<string, string>): BatchCheck {
  const text = batch.trim().toUpperCase(); // same as the server: inner spaces are not allowed
  const letters = Object.keys(batchBranches);
  if (!text) return { status: "empty" };
  if (letters.length === 0) return { status: "unavailable" };
  if (!/^[A-Z]\d{0,2}$/.test(text)) return { status: "invalid", message: "Enter your batch letter and number, e.g. B11." };
  const branch = batchBranches[text[0]];
  if (!branch) return { status: "invalid", message: `Batch ${text[0]} isn’t available for you. Valid batch letters: ${letters.join(", ")}.` };
  return { status: "ok", branch };
}
