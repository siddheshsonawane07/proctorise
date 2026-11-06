/**
 * BoardUI's tokens switch on a `.dark` class on <html>; the app follows the system setting. This keeps
 * the class in step with it, including when the setting changes while the page is open.
 */
export function followSystemColorScheme(): void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", query.matches);
  apply();
  query.addEventListener("change", apply);
}
