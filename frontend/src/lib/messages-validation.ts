export const NO_EMOJI_REGEX = new RegExp(
  "^((?!\\p{Extended_Pictographic}).)*$",
  "su"
);

/**
 * Returns true if the string contains any Extended_Pictographic emoji characters.
 */
export function containsEmoji(text: string): boolean {
  if (!text) return false;
  return !NO_EMOJI_REGEX.test(text);
}
