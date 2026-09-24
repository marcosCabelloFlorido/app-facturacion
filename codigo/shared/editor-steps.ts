// Persisted IDs stay stable for existing local and server drafts:
// 0 = party (formerly party + dates), 1 = lines, 2 = review, 3 = dates.
const storedSteps = [0, 3, 1, 2] as const;
export const persistedEditorStep = (index: number, kind?: string): number =>
  storedSteps[
    (kind === 'invoice' || kind === 'quote' || kind === 'purchase') && index === 3 ? 2 : index
  ] ?? 0;
export const editorStepIndex = (stored: number, kind?: string): number => {
  const index = Math.max(
    0,
    storedSteps.findIndex((step) => step === stored),
  );
  // The complete sheet replaces every old step; persisted IDs and draft payloads stay unchanged.
  return kind === 'invoice' || kind === 'quote' || kind === 'purchase' ? 2 : index;
};
