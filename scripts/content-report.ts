/**
 * npm run content:report      → lists every NC item in use, per practice, plus draft copy.
 * npm run content:strict      → same, but exits 1 if anything would block a STRICT_CONTENT build.
 */
import { practices } from '../content/practices/index.ts';
import { resolvePractice } from '../engine/resolve.ts';
import { draftItems, ncItems, strictViolations } from '../engine/nc.ts';

const strict = process.argv.includes('--strict');

for (const practice of practices) {
  const config = resolvePractice(practice);
  const nc = ncItems(config);
  const drafts = draftItems(config);
  console.log(`\n${config.practice.name} (?practice=${config.practice.id})`);
  console.log('─'.repeat(60));
  console.log(`Needs confirmation: ${nc.length}`);
  for (const item of nc) {
    const qs = item.verification.questions.join(', ') || 'no question linked';
    console.log(`  [${item.verification.status}] ${item.kind.padEnd(10)} ${item.id}  (${qs})`);
    console.log(`       ${item.title}`);
    for (const part of item.verification.ncParts) console.log(`       • NC part: ${part}`);
  }
  console.log(`Draft copy awaiting approval: ${drafts.length}`);
  for (const d of drafts) console.log(`  ${d.id}`);
}

const violations = strictViolations();
console.log(`\nSTRICT_CONTENT would ${violations.length ? `fail (${violations.length} items)` : 'pass'}.`);
if (strict && violations.length) process.exit(1);
