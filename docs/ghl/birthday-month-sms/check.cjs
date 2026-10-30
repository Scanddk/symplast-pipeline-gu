// Edge-case checks for custom-code.js. Run: node docs/ghl/birthday-month-sms/check.cjs
// Runs the GHL code body with a fixed clock and the inputData it gets in the workflow.
const fs = require('fs');
const body = fs.readFileSync(require("path").join(__dirname, "custom-code.js"), 'utf8');
const RealDate = Date;
function run(input, isoNow) {
  const fixed = new RealDate(isoNow).getTime();
  class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } }
  const fn = new Function('inputData', 'Date', `let output; return (async () => { ${body}\n; return output; })();`);
  return fn(input, FakeDate);
}
const base = { timezone: 'America/New_York', placeholderDob: '1980-01-01', sendHour: '9', cutoffHour: '12', dateOrder: 'MDY', lastSentYear: '' };
const cases = [
  // [label, dob, lastSent, nowUTC, expectedStatus, expectedMonth, expectedNextSend]
  ['placeholder ISO', '1980-01-01', '', '2026-01-01T14:00:00Z', 'excluded_placeholder_dob', '', ''],
  ['placeholder US', '01/01/1980', '', '2026-01-01T14:00:00Z', 'excluded_placeholder_dob', '', ''],
  ['placeholder text', 'Jan 1st 1980', '', '2026-01-01T14:00:00Z', 'excluded_placeholder_dob', '', ''],
  ['placeholder UTC ts', '1980-01-01T00:00:00.000Z', '', '2026-01-01T14:00:00Z', 'excluded_placeholder_dob', '', ''],
  ['placeholder epoch ms', String(Date.UTC(1980,0,1)), '', '2026-01-01T14:00:00Z', 'excluded_placeholder_dob', '', ''],
  ['Jan 1 other year sends', '1985-01-01', '', '2026-01-01T14:00:00Z', 'send_now', '1', '2026-01-01 09:00'],
  ['Jan 1 1980 adjacent date 1980-01-02 sends', '1980-01-02', '', '2026-01-01T14:00:00Z', 'send_now', '1', '2026-01-01 09:00'],
  ['missing', '', '', '2026-03-01T14:00:00Z', 'excluded_missing_dob', '', ''],
  ['unresolved merge', '{{contact.date_of_birth}}', '', '2026-03-01T14:00:00Z', 'excluded_missing_dob', '', ''],
  ['garbage', 'n/a', '', '2026-03-01T14:00:00Z', 'excluded_invalid_dob', '', ''],
  ['bad day', '02/30/1990', '', '2026-03-01T14:00:00Z', 'excluded_invalid_dob', '', ''],
  ['future', '2030-05-05', '', '2026-03-01T14:00:00Z', 'excluded_invalid_dob', '', ''],
  ['March bday on Mar 1 9:00 ET', '03/17/1990', '', '2026-03-01T14:00:00Z', 'send_now', '3', '2026-03-01 09:00'],
  ['March bday on Mar 1 8:30 ET -> today', '03/17/1990', '', '2026-03-01T13:30:00Z', 'scheduled', '3', '2026-03-01 09:00'],
  ['March bday on Mar 1 13:00 ET -> next yr', '03/17/1990', '', '2026-03-01T18:00:00Z', 'scheduled', '3', '2027-03-01 09:00'],
  ['already sent this yr', '03/17/1990', '2026', '2026-03-01T14:05:00Z', 'scheduled', '3', '2027-03-01 09:00'],
  ['later month this yr', '11/20/1990', '', '2026-10-30T14:00:00Z', 'scheduled', '11', '2026-11-01 09:00'],
  ['earlier month -> next yr', '02/20/1990', '', '2026-10-30T14:00:00Z', 'scheduled', '2', '2027-02-01 09:00'],
  ['DOB moved later after send', '12/05/1990', '2026', '2026-10-30T14:00:00Z', 'scheduled', '12', '2027-12-01 09:00'],
  ['UTC midnight ts bday not shifted', '1990-03-01T00:00:00Z', '', '2026-03-01T14:00:00Z', 'send_now', '3', '2026-03-01 09:00'],
  ['ET evening Feb 28 = UTC Mar 1 not send day', '03/10/1990', '', '2026-03-01T02:00:00Z', 'scheduled', '3', '2026-03-01 09:00'],
  ['DMY order', '17/03/1990', '', '2026-03-01T14:00:00Z', 'send_now', '3', '2026-03-01 09:00'],
  ['long month name', 'March 17, 1990', '', '2026-03-01T14:00:00Z', 'send_now', '3', '2026-03-01 09:00'],
  ['leap day valid', '02/29/1992', '', '2026-02-01T14:00:00Z', 'send_now', '2', '2026-02-01 09:00'],
  ['leap day invalid yr', '02/29/1991', '', '2026-02-01T14:00:00Z', 'excluded_invalid_dob', '', ''],
  ['dec 31 -> jan bday next yr', '1985-01-15', '2026', '2026-12-31T20:00:00Z', 'scheduled', '1', '2027-01-01 09:00'],
];
(async () => {
  let fail = 0;
  for (const [label, dob, last, now, st, mo, ns] of cases) {
    const inp = { ...base, dob, lastSentYear: last, dateOrder: label === 'DMY order' ? 'DMY' : 'MDY' };
    const out = await run(inp, now);
    const ok = out.status === st && out.birthMonth === mo && out.nextSend === ns;
    if (!ok) fail++;
    console.log(ok ? 'PASS' : 'FAIL', label, JSON.stringify(out));
  }
  const bad = await run({ ...base, dob: '1990-03-03', timezone: 'Mars/Base' }, '2026-03-01T14:00:00Z');
  console.log(bad.status === 'config_error' ? 'PASS' : 'FAIL', 'bad tz', JSON.stringify(bad)); if (bad.status !== 'config_error') fail++;
  const h10 = await run({ ...base, dob: '1990-03-03', sendHour: '10' }, '2026-03-01T14:30:00Z');
  console.log(h10.status === 'scheduled' && h10.nextSend === '2026-03-01 10:00' ? 'PASS' : 'FAIL', '10am config at 9:30', JSON.stringify(h10));
  console.log(fail ? `${fail} FAILED` : 'ALL PASS');
})();
