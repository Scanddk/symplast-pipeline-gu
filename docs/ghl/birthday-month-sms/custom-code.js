// GHL Custom Code action body — "Birthday SMS: compute"
// Paste everything below into Workflow 1, step 1 (JavaScript). GHL wraps it in
// an async function, exposes the mapped properties as `inputData`, and reads the
// result from `output`.
//
// Properties to include in code (key -> value):
//   dob             -> {{contact.date_of_birth}}            (pick from the variable picker)
//   lastSentYear    -> {{contact.birthday_sms_last_sent_year}}
//   timezone        -> America/New_York   (IANA name; must match the sub-account timezone)
//   placeholderDob  -> 1980-01-01
//   sendHour        -> 9                  (use 10 if the client prefers 10:00 AM)
//   cutoffHour      -> 12                 (same-day sends allowed until this hour)
//   dateOrder       -> MDY                (DMY only if the sub-account shows day-first dates)
//
// Output fields (all strings, so they can be written straight into contact fields):
//   status       send_now | scheduled | excluded_missing_dob | excluded_invalid_dob |
//                excluded_placeholder_dob | config_error
//   birthMonth   "1".."12", or "" when excluded
//   currentYear  four-digit year in the sub-account timezone
//   nextSend     "YYYY-MM-01 HH:00" for reporting, or "" when excluded
//   detail       human-readable reason, for the workflow execution log

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function monthFromName(name) {
  return MONTHS[String(name).slice(0, 3).toLowerCase()] || 0;
}

// Reads the calendar date as written. Never goes through local-time Date parsing,
// which would shift "1980-01-01T00:00:00Z" to Dec 31 1979 in US timezones.
function parseDate(raw, order) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s || s.includes("{{") || /^(null|undefined)$/i.test(s)) return { empty: true };

  let y, m, d, x;
  if ((x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    y = +x[1]; m = +x[2]; d = +x[3];
  } else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    if (order === "DMY") { d = +x[1]; m = +x[2]; } else { m = +x[1]; d = +x[2]; }
    y = +x[3];
  } else if ((x = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/))) {
    m = monthFromName(x[1]); d = +x[2]; y = +x[3];
  } else if ((x = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/))) {
    d = +x[1]; m = monthFromName(x[2]); y = +x[3];
  } else if (/^-?\d{10,13}$/.test(s)) {
    // Epoch seconds or milliseconds; GHL stores dates at UTC midnight.
    const n = Number(s);
    const dt = new Date(s.replace("-", "").length <= 10 ? n * 1000 : n);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else {
    return { invalid: true };
  }

  if (!(m >= 1 && m <= 12) || !(y >= 1900)) return { invalid: true };
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (!(d >= 1 && d <= daysInMonth)) return { invalid: true };
  return { y, m, d };
}

function localNow(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function compute(input) {
  const order = String(input.dateOrder || "MDY").toUpperCase();
  const sendHour = Number(input.sendHour || 9);
  const cutoffHour = Number(input.cutoffHour || 12);
  const result = (status, extra) =>
    Object.assign({ status, birthMonth: "", currentYear: "", nextSend: "", detail: "" }, extra);

  let now;
  try {
    now = localNow(String(input.timezone || "").trim());
  } catch (e) {
    return result("config_error", { detail: `Bad timezone "${input.timezone}": ${e.message}` });
  }
  const currentYear = String(now.y);

  const placeholder = parseDate(input.placeholderDob || "1980-01-01", "MDY");
  const dob = parseDate(input.dob, order);
  if (dob.empty) return result("excluded_missing_dob", { currentYear, detail: "No date of birth" });
  if (dob.invalid) {
    return result("excluded_invalid_dob", { currentYear, detail: `Unreadable date of birth "${input.dob}"` });
  }
  if (dob.y === placeholder.y && dob.m === placeholder.m && dob.d === placeholder.d) {
    return result("excluded_placeholder_dob", { currentYear, detail: "Placeholder date of birth" });
  }
  const todayKey = now.y * 10000 + now.m * 100 + now.d;
  if (dob.y * 10000 + dob.m * 100 + dob.d > todayKey) {
    return result("excluded_invalid_dob", { currentYear, detail: "Date of birth is in the future" });
  }

  const sentThisYear = Number(input.lastSentYear) >= now.y;
  const isSendDay = now.m === dob.m && now.d === 1;
  const birthMonth = String(dob.m);

  if (!sentThisYear && isSendDay && now.h >= sendHour && now.h < cutoffHour) {
    return result("send_now", {
      birthMonth, currentYear,
      nextSend: `${now.y}-${pad(dob.m)}-01 ${pad(sendHour)}:00`,
      detail: "1st of birth month, inside the send window",
    });
  }

  const stillAheadThisYear = now.m < dob.m || (isSendDay && now.h < sendHour);
  const year = !sentThisYear && stillAheadThisYear ? now.y : now.y + 1;
  return result("scheduled", {
    birthMonth, currentYear,
    nextSend: `${year}-${pad(dob.m)}-01 ${pad(sendHour)}:00`,
    detail: sentThisYear ? "Already sent this year" : "Waiting for the 1st of the birth month",
  });
}

output = compute(inputData);
