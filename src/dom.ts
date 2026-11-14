export function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

// Profiles are checked when the site is built, so what reaches this box is a fault in the page itself.
export function showLoadError(what: string, error: unknown): void {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `${what} could not load.\n\n${error instanceof Error ? error.message : String(error)}`;
  document.body.prepend(box);
}
