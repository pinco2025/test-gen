/**
 * Auto-formatting utilities for text content.
 * Applied automatically when saving IPQ questions.
 */

/**
 * Limits consecutive newlines to a maximum of 2.
 * Replaces 3+ consecutive newlines with exactly 2 newlines.
 * This ensures professional formatting without excessive whitespace.
 * 
 * @param text - The text to format
 * @returns Formatted text with limited newlines
 */
export const limitNewlines = (text: string): string => {
    if (!text) return text;
    return text.replace(/\n{3,}/g, '\n\n');
};
