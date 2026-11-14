import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { parseProfile } from './src/schema';

const profilesDir = resolve(import.meta.dirname, 'profiles');

// Profiles are checked here, when the site is built, served locally or tested. A broken one stops
// the build and names the field; a good one reaches the pages already parsed, so the validator
// itself is never sent to a visitor.
function checkedProfiles(): Plugin {
  return {
    name: 'checked-profiles',
    enforce: 'pre',
    buildStart() {
      const shown = readdirSync(profilesDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
      if (shown.length === 0) throw new Error('No restaurant profiles found in /profiles');
      const slugs = shown.map((f) => parseProfile(JSON.parse(readFileSync(join(profilesDir, f), 'utf8')), f).slug);
      if (new Set(slugs).size !== slugs.length) throw new Error('Two profiles share the same slug');
    },
    transform(code, id) {
      const file = id.split('?')[0]!;
      if (dirname(file) !== profilesDir || !file.endsWith('.json')) return;
      return { code: JSON.stringify(parseProfile(JSON.parse(code), basename(file))), map: null };
    },
  };
}

export default defineConfig({
  plugins: [checkedProfiles()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        report: resolve(import.meta.dirname, 'report/index.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
