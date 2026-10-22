import type { Cast } from '../../schema/scenario.ts';
import type { Copy } from '../../schema/copy.ts';

/** "(555) 010-0147" → "+15550100147", as the CRM shows numbers in the dialer and the SMS composer. */
export const toE164 = (phone: string) => `+1${phone.replace(/\D/g, '')}`;

/** The fictional patient's contact details, shared by every replica so they always match. */
export function demoPatient(cast: Cast, copy: Copy) {
  const [first, ...rest] = cast.name.split(' ');
  const last = rest.join(' ');
  return {
    first,
    last,
    initials: (first.charAt(0) + last.charAt(0)).toUpperCase(),
    email: `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@example.com',
    phone: copy.ehr.phone,
  };
}

/**
 * The website form as the CRM saves it in a note: one line per field, in the CRM's order. Fields the form
 * didn't ask for stay blank, as they do in the real note; `gap` puts a blank line before a field.
 */
export function formNoteLines(cast: Cast, copy: Copy) {
  const patient = demoPatient(cast, copy);
  const { formNote: f } = copy.opportunityModal;
  const { webForm: w } = copy;
  return [
    { label: f.name, value: cast.name, gap: false },
    { label: f.email, value: patient.email, gap: false },
    { label: f.phone, value: patient.phone, gap: false },
    { label: f.dob, value: '', gap: true },
    { label: f.surgical, value: w.interest, gap: true },
    { label: f.nonSurgical, value: '', gap: true },
    { label: f.gender, value: '', gap: true },
    { label: f.timeline, value: '', gap: true },
    { label: f.message, value: w.message, gap: true },
  ];
}
