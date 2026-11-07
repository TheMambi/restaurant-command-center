import { parseProfile, type Profile } from './schema';

// Files starting with an underscore (like the template) are not shown in the app.
const files = import.meta.glob<unknown>('../profiles/[!_]*.json', { eager: true, import: 'default' });

export function loadProfiles(): Profile[] {
  const profiles = Object.entries(files)
    .map(([path, raw]) => parseProfile(raw, path))
    .sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name));
  if (profiles.length === 0) throw new Error('No restaurant profiles found in /profiles');
  const slugs = new Set(profiles.map((p) => p.slug));
  if (slugs.size !== profiles.length) throw new Error('Two profiles share the same slug');
  return profiles;
}
