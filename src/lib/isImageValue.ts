/**
 * Fields like a project's "icon" can hold either a plain emoji/text
 * (legacy) or an image URL / uploaded file URL (new). This tells the two
 * apart so we know whether to render an <img> or plain text.
 */
export const isImageValue = (value?: string | null): value is string =>
  !!value && /^(https?:\/\/|data:image\/|\/)/i.test(value.trim());
