import type { Plugin } from 'vite';

export function strictContent(): Plugin {
  return {
    name: 'strict-content',
    async buildStart() {
      if (process.env.STRICT_CONTENT !== 'true') return;
      const { strictViolations } = await import('../engine/nc.ts');
      const violations = strictViolations();
      if (violations.length > 0) {
        const lines = violations.map((v) => `  [${v.practice}] ${v.kind} ${v.id}: ${v.title}`);
        this.error(`STRICT_CONTENT: ${violations.length} NC rule(s) or draft copy item(s) would appear in the client view:\n${lines.join('\n')}`);
      }
    },
  };
}
