export function saveWidth(key: string, width: number): void {
  try {
    localStorage.setItem(key, String(width));
  } catch {
    // storage unavailable
  }
}
