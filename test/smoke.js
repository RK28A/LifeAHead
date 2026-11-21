/* Smoke test: plays thousands of lives with random choices and checks that nothing
   throws and that ages at death track each country's life expectancy. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = ['data.js', 'content.js', 'game.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', f), 'utf8')).join('\n');
const sandbox = { module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.T = { newLife, advance, choose, applyVerdict, lifeExp, seedRandom, COUNTRIES, COUNTRY_BY_CODE, AI, DECISIONS, contextFor, rnd: () => rnd() };', sandbox);
const T = sandbox.T;
T.seedRandom(20261121);

function play(country, withAI) {
  const s = T.newLife({ country });
  let guard = 0;
  while (s.alive) {
    if (++guard > 400) throw new Error('life does not end');
    T.advance(s);
    if (!s.pending) continue;
    if (s.pending.kind === 'decision') { T.choose(s, Math.floor(T.rnd() * s.pending.labels.length)); continue; }
    JSON.stringify(T.contextFor(s));
    T.applyVerdict(s, {
      narration: 'Filed.', effects: { health: 2, happiness: -3, knowledge: 40, bonds: 'x' }, incomeFactor: 99,
      changes: { school: 'left', job: T.rnd() < 0.3 ? 'new' : 'unchanged', jobTitle: 'lighthouse keeper', jobTier: 7,
        relationship: T.rnd() < 0.3 ? 'married' : 'unchanged', partnerName: null, childrenDelta: 1, smoker: 'unchanged',
        moveTo: T.rnd() < 0.2 ? 'CAN' : 'ZZZ' },
      risk: 0.01, riskCause: 'an administrative error', thread: 'Owes the Office a form.',
      echoes: [{ inYears: 2, text: 'It comes back.', effects: { happiness: 3 }, incomeFactor: 1 }],
      followUp: T.rnd() < 0.3 ? { inYears: 3, question: 'And now?', options: ['Yes', 'No'] } : null, safety: 'none',
    }, 'I do something unexpected', true);
  }
  for (const k of ['health', 'happiness', 'knowledge', 'bonds']) {
    if (!(s.st[k] >= 0 && s.st[k] <= 100)) throw new Error(`stat ${k} out of range: ${s.st[k]}`);
  }
  if (!s.verdict || !s.epitaph || !s.cause) throw new Error('unfinished record');
  for (const e of s.log) if (/\{|undefined|null|NaN/.test(e.text)) throw new Error(`bad text: ${e.text}`);
  return s;
}

let failed = false;
console.log('country        table  played  under-5 (table / played, per 1000)');
for (const code of ['NGA', 'IND', 'TCD', 'BRA', 'USA', 'FRA', 'JPN', 'RUS']) {
  const c = T.COUNTRY_BY_CODE[code];
  const n = 4000;
  let sum = 0, u5 = 0;
  for (let i = 0; i < n; i++) { const s = play(c, false); sum += s.age + 0.5; if (s.age < 5) u5++; }
  const table = (c.leM * 0.512 + c.leF * 0.488), mean = sum / n;
  if (Math.abs(mean - table) > 3.5) failed = true;
  console.log(`${c.name.padEnd(14)} ${table.toFixed(1).padStart(5)}  ${mean.toFixed(1).padStart(6)}  ${Math.round(c.u5 * 1000)} / ${Math.round(u5 / n * 1000)}`);
}

T.AI.on = true;
let asked = 0, ages = 0;
for (let i = 0; i < 3000; i++) { const s = play(undefined, true); asked += s.freeAnswers; ages += s.age; }
console.log(`3000 random lives with the referee stubbed: mean age ${(ages / 3000).toFixed(1)}, ${(asked / 3000).toFixed(1)} written answers per life`);

if (failed) { console.error('FAILED: ages at death drift more than 3.5 years from the table'); process.exit(1); }
console.log('ok');
