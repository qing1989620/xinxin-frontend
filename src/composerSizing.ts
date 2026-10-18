// Measure rendered wraps (including Chinese text), rather than counting newlines.
export function resizeComposer(input: HTMLTextAreaElement) {
  const style = getComputedStyle(input);
  const line =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.75;
  const padding =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const border =
    parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const minimum = line + padding + border;
  const maximum = 4 * line + padding + border;
  input.style.height = "0px";
  const content = input.scrollHeight + border;
  input.style.height = `${Math.min(maximum, Math.max(minimum, content))}px`;
  input.style.overflowY = content > maximum + 1 ? "auto" : "hidden";
}
