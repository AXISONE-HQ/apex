let uniqueCounter = 1;

export function uniqueName(prefix = "Name") {
  return `${prefix} ${uniqueCounter++}`;
}
