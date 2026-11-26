export const byId = id => document.getElementById(id);
export const pct = value => (100 * value).toFixed(1) + "%";

export function node(tag, caption, className) {
  const element = document.createElement(tag);
  if (caption != null) element.textContent = caption;
  if (className) element.className = className;
  return element;
}

export function palette(name) {
  return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
}

export function canvasContext(canvas, explicitWidth, explicitHeight) {
  const width = explicitWidth ?? canvas.clientWidth;
  const height = explicitHeight ?? canvas.clientHeight;
  if (width === 0 || height === 0) return null;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  if (explicitWidth) {
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  return {context, width, height};
}

export function line(context, x1, y1, x2, y2) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

export function circle(context, x, y, radius, fill) {
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  if (fill) context.fill();
  else context.stroke();
}

export function download(name, contents) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(contents, null, 2) + "\n"], {type: "application/json"}));
  const link = node("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
