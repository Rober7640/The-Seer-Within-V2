// dump-read-prompt — print the EXACT prompt Version C sends, for review.
//   npx tsx scripts/dump-read-prompt.ts <device> <hook> <panel> "<what she typed>"
// Everything before "## ALREADY SAID" is EVELYN_BASE_PROMPT, shared with the whole
// V1 funnel; pass --full to see that too.
import { buildReadReflectPrompt } from '../server/lib/prompts'
const [device, hook, panel, answer] = process.argv.slice(2)
const p = buildReadReflectPrompt(
  (device || 'tea') as any, (hook || 'hiding-something') as any, (panel || 'b') as any,
  answer || 'nothing i can point to. i just get this feeling and then i feel stupid for having it',
)
console.log(process.argv.includes('--full') ? p : p.slice(p.indexOf('## ALREADY SAID')))
