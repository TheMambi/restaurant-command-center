// Fails when a committed text file holds a name from the private deny-list: real businesses, people
// or places that must never appear in this public repo. The list is not in the repo. CI reads it from
// the repository secret REAL_NAME_DENY_LIST, one name per line; without it this check is skipped.
// A hit is reported by file and line only, so the names stay out of the log.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const names = (process.env.REAL_NAME_DENY_LIST ?? '')
  .split('\n')
  .map((n) => n.trim().toLowerCase())
  .filter((n) => n.length > 0);
if (names.length === 0) {
  console.log('Deny-list check skipped: REAL_NAME_DENY_LIST is not set.');
  process.exit(0);
}

const binary = /\.(avif|webp|png|jpe?g|ico|woff2?|pdf)$/;
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter((f) => f && !binary.test(f));
const hits = [];
for (const file of files) {
  readFileSync(file, 'utf8')
    .toLowerCase()
    .split('\n')
    .forEach((line, i) => {
      if (names.some((n) => line.includes(n))) hits.push(`${file}:${i + 1}`);
    });
}
if (hits.length > 0) {
  console.error(`A name on the private deny-list appears in:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`Deny-list check passed: ${names.length} names, ${files.length} files.`);
