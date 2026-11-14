import type { Profile } from './schema';

// Files starting with an underscore (like the template) are not shown in the app. The build checks
// each file against the schema and hands over the parsed result (vite.config.ts), so nothing is
// validated in the browser.
const files = import.meta.glob<Profile>('../profiles/[!_]*.json', { eager: true, import: 'default' });

export function loadProfiles(): Profile[] {
  return Object.values(files).sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name));
}
