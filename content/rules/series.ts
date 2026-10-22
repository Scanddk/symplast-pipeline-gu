import type { SeriesInput } from '../../schema/rules.ts';

/**
 * Text series. The number of texts, the waits, and the message wording are placeholders (NC, OQ-13, OQ-28).
 * `waitDays` is relative: the first is counted from entering the stage, each later one from the text before it.
 * Whether the first text sends immediately on entry is unknown, so no placeholder uses a 0-day first wait.
 * Messages are example wording written for the guide, not a practice's real texts. Replace them as real copy arrives.
 */
const placeholderTexts = (messages: [string, string, string]) =>
  messages.map((message, i) => ({ id: `text_${i + 1}`, waitDays: i === 0 ? 1 : 7, message }));

const placeholderVerification = {
  status: 'NC' as const,
  questions: ['OQ-13', 'OQ-28', 'OQ-7'],
};

export const series: SeriesInput[] = [
  {
    id: 'new_lead_texts',
    stageId: 'new_lead',
    name: { client: 'New Lead texts', internal: 'New Lead nurture series' },
    purpose: {
      client: 'Encourage a new lead to book a consultation.',
      internal: 'SMS nurture that starts when the opportunity is created in New Lead.',
    },
    texts: placeholderTexts([
      'Hi {firstName}, thanks for reaching out! When’s a good time to talk about booking your consultation?',
      'Hi {firstName}, just checking in. We’d love to help you find a consultation time that works for you.',
      'Hi {firstName}, we still have consultation openings this month. Reply here and we’ll get you scheduled.',
    ]),
    exampleTiming: true,
    exampleMessages: true,
    startCaption: {
      client: 'The New Lead texts start.',
      internal: 'Contact starts the New Lead nurture series (placeholder timing).',
    },
    dnd: {
      label: { client: 'New Lead', internal: 'DND Nurture Workflows → (no New Lead option seen)' },
      verification: { status: 'NC', questions: ['OQ-8', 'OQ-14'] },
    },
    verification: { ...placeholderVerification, questions: ['OQ-13', 'OQ-28', 'OQ-7', 'OQ-1'] },
  },
  {
    id: 'no_response_texts',
    stageId: 'no_response',
    name: { client: 'No Response texts', internal: 'No Response/Didn’t Schedule nurture series' },
    purpose: {
      client: "Follow up with a lead who hasn't booked a consultation.",
      internal: 'SMS nurture that starts when the card enters No Response/Didn’t Schedule.',
    },
    texts: placeholderTexts([
      'Hi {firstName}, we haven’t been able to connect yet. Would you like help booking a consultation?',
      'Hi {firstName}, still thinking it over? We’re happy to answer any questions before you book.',
      'Hi {firstName}, we’ll be here when you’re ready. Just reply and we’ll find a consultation time for you.',
    ]),
    exampleTiming: true,
    exampleMessages: true,
    startCaption: {
      client: 'The No Response texts start.',
      internal: 'Contact starts the No Response nurture series (placeholder timing).',
    },
    dnd: {
      label: {
        client: 'No Response/Didn\'t Schedule',
        internal: 'DND Nurture Workflows → "No Response/Didn\'t Schedule" (seen in Demo Prod)',
      },
      verification: { status: 'NC', questions: ['OQ-8', 'OQ-20'] },
    },
    verification: placeholderVerification,
  },
  {
    id: 'no_show_texts',
    stageId: 'no_show',
    name: { client: 'No Show texts', internal: 'No Show nurture series' },
    purpose: {
      client: 'Help the patient rebook a missed consultation.',
      internal: 'SMS nurture that starts when the card enters No Show.',
    },
    texts: placeholderTexts([
      'Hi {firstName}, we missed you at your consultation today. Would you like to pick a new time?',
      'Hi {firstName}, life gets busy! Reply here and we’ll find a new consultation time for you.',
      'Hi {firstName}, we’d still love to see you. Let us know when you’d like to rebook.',
    ]),
    exampleTiming: true,
    exampleMessages: true,
    startCaption: {
      client: 'The No Show texts start.',
      internal: 'Contact starts the No Show nurture series (placeholder timing).',
    },
    dnd: {
      label: { client: 'No Show Nurture', internal: 'DND Nurture Workflows → "No Show Nurture" (seen in Demo Prod)' },
      verification: { status: 'NC', questions: ['OQ-8'] },
    },
    verification: placeholderVerification,
  },
  {
    id: 'quoted_nurture_texts',
    stageId: 'quoted_nurture',
    name: { client: 'Quoted Nurture texts', internal: 'Quoted Nurture series' },
    purpose: {
      client: 'Follow up on the quote until a procedure is booked.',
      internal: 'SMS nurture that starts when the card enters Quoted Nurture.',
    },
    texts: placeholderTexts([
      'Hi {firstName}, it was great meeting you! Do you have any questions about your quote?',
      'Hi {firstName}, just following up on your quote. We’re here if you’d like to talk through next steps.',
      'Hi {firstName}, whenever you’re ready to book your procedure, reply here and we’ll take care of it.',
    ]),
    exampleTiming: true,
    exampleMessages: true,
    startCaption: {
      client: 'The Quoted Nurture texts start.',
      internal: 'Contact starts the Quoted Nurture series (placeholder timing).',
    },
    dnd: {
      label: { client: 'Quoted Nurture', internal: 'DND Nurture Workflows → "Quoted Nurture" (seen in Demo Prod)' },
      verification: { status: 'NC', questions: ['OQ-8'] },
    },
    verification: placeholderVerification,
  },
];
