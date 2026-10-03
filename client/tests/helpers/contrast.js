/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours. */

function channelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  }
  const [r, g, b] = [0, 2, 4].map((offset) =>
    channelToLinear(parseInt(match[1].slice(offset, offset + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
