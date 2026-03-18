/**
 * Shared image optimization constants.
 *
 * BLUR_DATA_URL is a tiny 4x4 neutral-gray PNG encoded as a data URI.
 * It provides a lightweight placeholder shown while images load,
 * avoiding layout shift and giving users immediate visual feedback.
 */

// 4x4 neutral gray (#e0e0e0) PNG — only ~70 bytes
export const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAG0lEQVQIHWPY9+8/AwMDEwMDAwMDw////xkYABjUBAkFfnLBAAAAAElFTkSuQmCC';
