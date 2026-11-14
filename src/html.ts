// The private field makes the type nominal: an object that merely has a `value` is not SafeHtml, and
// the class is not exported, so the `html` tag below is the only way to make one.
class SafeHtml {
  readonly #made = true;
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
  static is(candidate: unknown): candidate is SafeHtml {
    return typeof candidate === 'object' && candidate !== null && #made in candidate;
  }
}
export type { SafeHtml };

type Value = SafeHtml | string | number | null | undefined | false | Value[];

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escape = (text: string): string => text.replace(/[&<>"']/g, (ch) => escapes[ch]!);

function render(value: Value): string {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escape(String(value));
}

// Every interpolated value is escaped unless it is already SafeHtml, so profile text can never inject markup.
export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  return new SafeHtml(strings.reduce((out, str, i) => out + str + (i < values.length ? render(values[i]!) : ''), ''));
}

interface HtmlPolicy {
  createHTML(input: string): unknown;
}
const factory = (globalThis as { trustedTypes?: { createPolicy(name: string, rules: { createHTML: (s: string) => string }): HtmlPolicy } }).trustedTypes;
// The site's Content-Security-Policy (vercel.json) only lets this one policy write markup.
const policy = factory?.createPolicy('rcc', { createHTML: (s) => s });

// The only place markup enters the page. It takes SafeHtml alone, checked by the compiler and again
// here for callers the compiler cannot see, so a plain string cannot reach innerHTML or the policy.
export function setHtml(target: Element, content: SafeHtml | SafeHtml[]): void {
  const parts = Array.isArray(content) ? content : [content];
  if (!parts.every(SafeHtml.is)) throw new TypeError('setHtml only writes markup made by the html tag');
  const markup = parts.map((c) => c.value).join('');
  target.innerHTML = (policy ? policy.createHTML(markup) : markup) as string;
}
