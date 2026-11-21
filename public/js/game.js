/* LifeAHead - engine and interface. */
'use strict';

// ---------- Random -------------------------------------------------------------------
let rnd = Math.random;
function seedRandom(seed) {
  let a = seed >>> 0;
  rnd = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const chance = p => rnd() < p;
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

function weighted(items, weight) {
  let r = rnd() * items.reduce((t, i) => t + weight(i), 0);
  for (const i of items) { r -= weight(i); if (r <= 0) return i; }
  return items[items.length - 1];
}

// Inverse of the normal distribution (Acklam's approximation).
function probit(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - 0.02425) return -probit(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ---------- The model ----------------------------------------------------------------
const STATS = ['health', 'happiness', 'knowledge', 'bonds'];
const lifeExp = (c, sex) => (sex === 'F' ? c.leF : c.leM);
const income = s => Math.max(50, Math.round(s.c.gdp * 0.55 * s.mult / 10) * 10);
const money = n => '$' + Math.round(n).toLocaleString('en-US');

// Chance of dying during the coming year.
function deathProb(s) {
  const c = s.c;
  const u5 = c.u5 * clamp(1.3 - 0.3 * s.fam, 0.6, 1.3);
  if (s.age === 0) return 0.7 * u5;
  if (s.age < 5) return 0.075 * u5;
  if (s.age >= 112) return 1;
  const e0 = c === s.born ? lifeExp(c, s.sex) : (lifeExp(c, s.sex) + lifeExp(s.born, s.sex)) / 2;
  const adult = (e0 - c.u5) / (1 - c.u5);           // life expectancy once childhood is survived
  const b = 8.5 + (85 - e0) * 0.12;                 // wider spread of ages at death where lives are shorter
  const mode = adult + 0.577 * b + 1.5 + (s.st.health - 60) * 0.1 - (s.smoker ? 5 : 0);
  const hazard = Math.exp((s.age - mode) / b) / b + 0.0004 * (1 + c.u5 * 20);
  return 1 - Math.exp(-hazard);
}

function drawCohort(self) {
  return Array.from({ length: 4 }, () => {
    const c = weighted(COUNTRIES, x => x.births);
    const sex = chance(0.512) ? 'M' : 'F';
    const p = { c, born: c, sex, fam: 1, smoker: false, st: { health: 60 }, age: 0 };
    while (!chance(deathProb(p))) p.age++;
    return { name: pick(NAMES[c.names][sex]), flag: c.flag, country: c.name, died: p.age };
  });
}

function newLife(opts = {}) {
  const born = opts.country || weighted(COUNTRIES, c => c.births);
  const sex = chance(0.512) ? 'M' : 'F';
  const sigma = Math.SQRT2 * probit((1 + born.gini) / 2);
  const pct = clamp(rnd(), 0.002, 0.998);
  const fam = Math.exp(sigma * probit(pct) - sigma * sigma / 2);
  const s = {
    name: pick(NAMES[born.names][sex]), sex, born, c: born, urban: chance(born.urban),
    pct, fam, mult: fam, age: 0, alive: true,
    st: { health: clamp(72 - born.u5 * 60 + (fam > 1 ? 4 : -2), 40, 90), happiness: 60, knowledge: 0, bonds: 55 },
    inSchool: false, uni: 0, edu: 'none', job: null, tier: 0, retired: false,
    partner: null, suitor: null, married: false, partners: 0, kids: 0, smoker: false,
    focus: null, tags: {}, log: [], used: {}, seen: new Set(), lastQuestion: -9,
    threads: [], echoes: [], followUps: [], interviewsDone: 0, freeAnswers: 0,
    happySum: 0, years: 0, pending: null,
    ticket: String(1e9 + Math.floor(rnd() * 8.9e9)).replace(/(\d)(?=(\d{3})+$)/g, '$1 '),
  };
  s.cohort = drawCohort(s);
  return s;
}

function giveJob(s, tier) {
  s.tier = clamp(tier, 0, 3);
  s.job = pick(JOBS[s.tier][1]);
  s.mult = JOBS[s.tier][0] * Math.exp(gauss() * 0.25) * Math.pow(s.fam, 0.3);
  s.retired = false;
}
function leaveSchool(s, tier) {
  s.inSchool = false; s.uni = 0;
  if (s.edu !== 'university') s.edu = s.age >= 17 ? 'secondary' : s.age >= 11 ? 'primary' : 'none';
  if (s.edu === 'secondary' && s.st.knowledge >= 55 && chance(0.4)) tier++;
  giveJob(s, tier);
}
function startUniversity(s) { s.inSchool = true; s.uni = 4; s.edu = 'secondary'; }
function moveCountry(s, dest) {
  if (!dest || dest === s.c) return;
  s.c = dest; s.urban = true;
  s.mult = clamp(s.mult * 0.6, 0.3, 2);
}
function emigrate(s) { moveCountry(s, COUNTRY_BY_CODE[pick(DESTINATIONS.filter(d => d !== s.c.code))]); }
function partnerName(s) {
  const sex = chance(0.92) ? (s.sex === 'F' ? 'M' : 'F') : s.sex;
  return pick(NAMES[s.c.names][sex]);
}

// Apply {health, happiness, knowledge, bonds, income}; return what actually changed.
function applyEffects(s, e) {
  const fx = [];
  if (!e) return fx;
  for (const k of STATS) {
    if (!e[k]) continue;
    const before = s.st[k];
    s.st[k] = clamp(before + e[k], 0, 100);
    const d = Math.round(s.st[k] - before);
    if (d) fx.push([k, d]);
  }
  if (e.income && e.income !== 1) {
    const before = income(s);
    s.mult = clamp(s.mult * e.income, 0.05, 60);
    const d = income(s) - before;
    if (d) fx.push(['income', d]);
  }
  return fx;
}

const curly = t => t.replace(/(^|[\s(])"/g, '$1“').replace(/"/g, '”').replace(/'/g, '’');
function fmt(s, t, was = {}) {
  if (typeof t === 'function') t = t(s);
  return curly(t
    .replace(/\{name\}/g, s.name)
    .replace(/\{partner\}/g, s.partner || was.partner || 'your partner')
    .replace(/\{country\}/g, s.c.inName)
    .replace(/\{job\}/g, s.job ? article(s.job) : 'between jobs'));
}
const article = j => (/^[aeiou]/i.test(j) ? 'an ' : 'a ') + j;

function record(s, entry) { s.log.push({ age: s.age, ...entry }); }

// ---------- One year -----------------------------------------------------------------
const FOCUS = [
  ['health', 'Health', { health: 1.2 }],
  ['learning', 'Learning', { knowledge: 1.5 }],
  ['money', 'Money', { happiness: -0.3 }],
  ['people', 'People', { bonds: 1.5 }],
  ['fun', 'Fun', { happiness: 1.5 }],
];

function drift(s) {
  const a = s.age, st = s.st;
  st.health += a > 75 ? -1.5 : a > 60 ? -0.9 : a > 40 ? -0.4 : a < 16 ? 0.4 : 0;
  st.happiness += (58 - st.happiness) * 0.06;
  if (st.bonds > 55) st.bonds -= 0.5;
  if (s.inSchool) st.knowledge += s.uni ? 5 : 4;
  else if (a < 14) st.knowledge += 1;
  if (s.smoker) st.health -= 0.6;
  if (a >= 6 && s.focus) {
    const f = FOCUS.find(x => x[0] === s.focus);
    for (const k in f[2]) st[k] += f[2][k];
    if (s.focus === 'money' && s.job && !s.retired) s.mult *= 1.015;
  }
  for (const k of STATS) st[k] = clamp(st[k], 0, 100);
}

function milestones(s) {
  if (s.age === 6) {
    const p = clamp(0.25 + s.c.school / 10 + (s.fam > 1 ? 0.1 : -0.05) + (s.urban ? 0.05 : 0), 0.3, 0.99);
    if (chance(p)) { s.inSchool = true; record(s, { kind: 'milestone', text: 'You start school. You are issued a seat, a slate and a classmate who eats chalk.' }); }
    else record(s, { kind: 'milestone', text: 'There is no school for you this year: too far, too costly, or simply not there. You stay home and help.' });
  }
  if (s.age === 12 && s.inSchool) s.edu = 'primary';
  if (s.uni > 0 && s.age > 18) {
    if (--s.uni === 0) {
      s.inSchool = false; s.edu = 'university';
      giveJob(s, chance(0.3) ? 3 : 2);
      record(s, { kind: 'milestone', text: fmt(s, 'You graduate. The Office frames nothing, but notes it. You are {job}.') });
    }
  }
  if (s.age === 66 && s.job && !s.retired && s.c.gdp < 12000) {
    record(s, { kind: 'milestone', text: 'Retirement does not appear on your form. You keep working.' });
  }
}

function eligible(s, d) {
  if (s.age < d.a[0] || s.age > d.a[1]) return false;
  if (d.if && !d.if(s)) return false;
  const last = s.used[d.id];
  return last === undefined || (d.rep && s.age - last >= d.rep);
}

function nextQuestion(s) {
  if (AI.on) {
    const i = s.followUps.findIndex(f => s.age >= f.at);
    if (i >= 0) {
      const f = s.followUps.splice(i, 1)[0];
      return { kind: 'followup', text: curly(f.q), labels: f.options };
    }
  }
  const must = DECISIONS.find(d => d.must && eligible(s, d));
  const iv = INTERVIEWS[s.interviewsDone];
  if (!must && AI.on && iv && s.age >= iv.age) {
    s.interviewsDone++;
    if (s.age <= iv.age + 2) return { kind: 'interview', text: iv.q, labels: [] };
  }
  let d = must;
  if (!d && s.age - s.lastQuestion >= 2 && chance(0.5)) {
    const pool = DECISIONS.filter(x => !x.must && eligible(s, x));
    if (pool.length) d = pick(pool);
  }
  if (!d) return null;
  s.used[d.id] = s.age;
  if (d.setup) d.setup(s);
  return { kind: 'decision', d, text: fmt(s, d.q), labels: d.o.map(o => o.l) };
}

function yearlyEvent(s) {
  const pool = EVENTS.filter(e => s.age >= e.a[0] && s.age <= e.a[1] && (!e.if || e.if(s)) && (e.rep || !s.seen.has(e)));
  if (!pool.length || !chance(0.85)) return;
  const e = pick(pool);
  s.seen.add(e);
  record(s, { kind: 'event', text: fmt(s, e.t), fx: applyEffects(s, e.e) });
}

function advance(s) {
  if (!s.alive || s.pending) return;
  if (chance(deathProb(s))) return die(s, causeOfDeath(s));
  s.age++; s.years++;
  drift(s);
  milestones(s);
  for (const echo of s.echoes.filter(e => s.age >= e.at)) {
    record(s, { kind: 'echo', text: curly(echo.text), fx: applyEffects(s, echo.e) });
  }
  s.echoes = s.echoes.filter(e => s.age < e.at);
  s.pending = nextQuestion(s);
  if (s.pending) s.lastQuestion = s.age; else yearlyEvent(s);
  s.happySum += s.st.happiness;
}

// A preset option was chosen for a written decision.
function choose(s, index) {
  const q = s.pending;
  const opt = q.d.o[index];
  let r = rnd(), out = opt.r[opt.r.length - 1];
  for (const o of opt.r) { r -= o.p; if (r < 0) { out = o; break; } }
  const was = { partner: s.partner };
  if (out.f) out.f(s);
  const fx = applyEffects(s, out.e);
  record(s, { kind: 'choice', q: q.text, a: opt.l, text: fmt(s, out.t, was), fx });
  s.pending = null;
}

// ---------- Death --------------------------------------------------------------------
function causeOfDeath(s) {
  const a = s.age, lowIncome = s.c.gdp < 10000;
  if (a < 5) return pick(lowIncome ? CAUSES.infantPoor : CAUSES.infantRich);
  if (a < 15) return pick(CAUSES.child);
  if (a < 40) return pick(lowIncome ? CAUSES.youngPoor : CAUSES.young);
  if (s.smoker && a >= 45 && chance(0.4)) return pick(CAUSES.smoker);
  if (a < 65) return pick(CAUSES.mid);
  if (a < 88) return pick(CAUSES.old);
  return pick(CAUSES.veryOld);
}

function die(s, cause) {
  s.alive = false; s.pending = null; s.cause = cause;
  s.avgHappy = s.years ? s.happySum / s.years : s.st.happiness;
  s.score = Math.round(clamp(s.age / 90, 0, 1) * 40 + s.avgHappy * 0.3 + s.st.bonds * 0.2 + s.st.knowledge * 0.1);
  s.verdict = VERDICTS.filter(v => s.score >= v[0]).pop()[1];
  s.epitaph = EPITAPHS.find(e => e[0](s))[1];
  s.badges = BADGES.filter(b => b[2](s)).map(b => [b[0], b[1]]);
  record(s, { kind: 'death', text: curly(s.age ? `You die at ${s.age}, of ${cause}.` : `You die before your first birthday, of ${cause}.`) });
}

// ---------- The AI referee -----------------------------------------------------------
const AI = { on: false, mock: false };

function contextFor(s) {
  return {
    name: s.name, sex: s.sex, age: s.age, bornIn: s.born.code, livesIn: s.c.code,
    setting: s.urban ? 'urban' : 'rural', familyIncomePercentile: Math.round(s.pct * 100),
    incomePerYearUSD: income(s),
    stats: Object.fromEntries(STATS.map(k => [k, Math.round(s.st[k])])),
    inSchool: s.inSchool, atUniversity: s.uni > 0, education: s.edu,
    job: s.job, retired: s.retired, partner: s.partner, married: s.married,
    children: s.kids, smoker: s.smoker, yearlyFocus: s.focus,
    threads: s.threads,
    scheduled: s.echoes.map(e => `at ${e.at}: ${e.text}`),
    recent: s.log.slice(-8).map(e => `${e.age}: ${e.q ? `[${e.q} -> ${e.a}] ` : ''}${e.text}`),
  };
}

const int = (x, lo, hi) => clamp(Math.round(Number(x) || 0), lo, hi);
const text = (x, max) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, max);
function cleanEffects(e = {}, f) {
  const out = { income: clamp(Number(f) || 1, 0.4, 2.5) };
  for (const k of STATS) out[k] = int(e[k], -15, 15);
  return out;
}

// Turn the referee's verdict into changes to the life. Everything is bounded here,
// whatever the model returned.
function applyVerdict(s, v, answer, typed) {
  const q = s.pending;
  const ch = v.changes || {};

  if (ch.school === 'enrolled' && s.age >= 5 && s.age <= 30) { s.inSchool = true; if (s.age >= 18 && !s.uni) s.uni = 4; }
  if (ch.school === 'left' && s.inSchool) {
    s.inSchool = false; s.uni = 0;
    if (s.edu !== 'university') s.edu = s.age >= 17 ? 'secondary' : s.age >= 11 ? 'primary' : 'none';
  }
  if (s.age >= 8) {
    if (ch.job === 'new' && text(ch.jobTitle, 60)) {
      s.tier = int(ch.jobTier, 0, 3);
      s.job = text(ch.jobTitle, 60);
      s.mult = JOBS[s.tier][0] * Math.exp(gauss() * 0.2) * Math.pow(s.fam, 0.3);
      s.retired = false;
    } else if (ch.job === 'lost' && s.job) { s.job = null; s.mult = Math.max(0.2, s.mult * 0.45); }
    else if (ch.job === 'retired' && s.job) s.retired = true;
  }
  if (s.age >= 13) {
    if (ch.relationship === 'new_partner') { s.partner = text(ch.partnerName, 30) || partnerName(s); s.married = false; s.partners++; }
    if (ch.relationship === 'married') { if (!s.partner) { s.partner = text(ch.partnerName, 30) || partnerName(s); s.partners++; } s.married = true; }
    if (ch.relationship === 'separated') { s.partner = null; s.married = false; }
    s.kids = clamp(s.kids + int(ch.childrenDelta, 0, 2), 0, 12);
  }
  if (ch.smoker === 'started' && s.age >= 10) s.smoker = true;
  if (ch.smoker === 'quit' && s.smoker) { s.smoker = false; s.tags.quit = true; }
  if (ch.moveTo && COUNTRY_BY_CODE[ch.moveTo]) moveCountry(s, COUNTRY_BY_CODE[ch.moveTo]);

  const fx = applyEffects(s, cleanEffects(v.effects, v.incomeFactor));
  if (text(v.thread, 160)) s.threads = [...s.threads, `age ${s.age}: ${text(v.thread, 160)}`].slice(-8);
  for (const e of (v.echoes || []).slice(0, 2)) {
    if (!text(e.text, 300) || s.echoes.length >= 12) continue;
    s.echoes.push({ at: s.age + int(e.inYears, 1, 25), text: text(e.text, 300), e: cleanEffects(e.effects, e.incomeFactor) });
  }
  const fu = v.followUp;
  if (fu && text(fu.question, 300) && s.followUps.length < 3) {
    s.followUps.push({ at: s.age + int(fu.inYears, 1, 20), q: text(fu.question, 300),
      options: (fu.options || []).map(o => text(o, 80)).filter(Boolean).slice(0, 3) });
  }
  if (typed) s.freeAnswers++;
  record(s, { kind: 'ai', q: q.text, a: answer, text: curly(text(v.narration, 700)) || 'The Office files your answer without comment.',
    fx, care: v.safety === 'self_harm' });
  s.pending = null;
  const risk = clamp(Number(v.risk) || 0, 0, 0.6);
  if (risk > 0 && chance(risk)) die(s, text(v.riskCause, 120) || 'a decision of your own');
}

async function askReferee(s, answer) {
  const q = s.pending;
  const res = await fetch('api/answer', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: contextFor(s), question: q.text, options: q.labels, answer }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `The Office is unavailable (error ${res.status}).`);
  return body;
}

// ---------- Interface ----------------------------------------------------------------
const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: nothing is kept */ } },
};

let life = null;
let auto = false, fast = false, timer = null, busy = false;

function show(id) {
  for (const sc of document.querySelectorAll('.screen')) sc.hidden = sc.id !== id;
  window.scrollTo(0, 0);
}

function field(dl, label, value) {
  const row = el('div', 'field');
  row.append(el('dt', '', label), el('dd', '', value));
  dl.append(row);
}

function cohortList(ul, s, final) {
  ul.replaceChildren(...s.cohort.map(p => {
    const li = el('li');
    const dead = p.died <= s.age && !(!final && s.age === 0);
    li.append(el('span', 'c-who', `${p.flag} ${p.name}, ${p.country}`));
    li.append(el('span', dead ? 'c-fate c-dead' : 'c-fate',
      final ? (p.died > s.age ? `outlived you, to ${p.died}` : `died at ${p.died}`)
        : dead ? `died at ${p.died}` : `alive, ${s.age}`));
    return li;
  }));
}

// --- home
function renderHome() {
  $('ticketNo').textContent = String(1e9 + Math.floor(Math.random() * 8.9e9)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
  const top = [...COUNTRIES].sort((a, b) => b.births - a.births).slice(0, 10);
  const max = top[0].births;
  $('odds').replaceChildren(...top.map(c => {
    const li = el('li');
    const pct = c.births / TOTAL_BIRTHS * 100;
    li.append(el('span', 'o-name', `${c.flag} ${c.name}`));
    const bar = el('span', 'o-bar'); bar.style.setProperty('--w', (c.births / max * 100).toFixed(1) + '%');
    li.append(bar, el('span', 'o-pct', pct.toFixed(1)));
    return li;
  }));
  const ice = COUNTRY_BY_CODE.ISL, usa = COUNTRY_BY_CODE.USA;
  $('oddsNote').textContent = `The United States comes in at ${(usa.births / TOTAL_BIRTHS * 100).toFixed(1)}. Iceland: one baby in ${Math.round(TOTAL_BIRTHS / ice.births).toLocaleString('en-US')}.`;

  const sel = $('realCountry');
  if (sel.options.length === 1) {
    for (const c of [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name))) sel.append(new Option(c.name, c.code));
    sel.value = store.get('lifeahead.real', '');
  }
  renderPast();
}

function renderPast() {
  const lives = store.get('lifeahead.lives', []);
  $('pastSheet').hidden = !lives.length;
  $('past').replaceChildren(...lives.map(l => {
    const li = el('li');
    li.append(el('span', 'p-who', `${l.flag} ${l.name}, ${l.country}`), el('span', 'p-age', `${l.age} years`),
      el('span', 'p-cause', l.cause), el('span', 'p-verdict', l.verdict));
    return li;
  }));
}

// --- birth
function startBirth() {
  life = newLife();
  const s = life;
  show('birth');
  $('assignment').hidden = true;
  const reel = $('reel');
  const land = () => {
    reel.replaceChildren(el('span', '', `${s.born.flag} ${s.born.name}`));
    reel.classList.add('landed');
    const dl = $('birthFields');
    dl.replaceChildren();
    const oneIn = Math.round(TOTAL_BIRTHS / s.born.births);
    field(dl, 'Name', `${s.name} (${s.sex === 'F' ? 'girl' : 'boy'})`);
    field(dl, 'Place', `${s.urban ? 'a town' : 'a village'} in ${s.born.inName}`);
    field(dl, 'Odds of this draw', oneIn <= 1 ? 'better than 1 in 2' : `1 birth in ${oneIn.toLocaleString('en-US')}`);
    field(dl, 'Household income', `${money(income(s))} per person a year, ${rank(s.pct)}`);
    field(dl, 'Life expectancy here', `${lifeExp(s.born, s.sex)} years`);
    field(dl, 'Children who die before 5', `${Math.round(s.born.u5 * 1000)} in 1,000`);
    cohortList($('birthCohort'), s, false);
    $('assignment').hidden = false;
    $('startBtn').focus({ preventScroll: true });
  };
  reel.classList.remove('landed');
  if (reducedMotion()) return land();
  let i = 0;
  const spin = () => {
    if (life !== s) return;
    if (i >= 22) return land();
    const c = pick(COUNTRIES);
    reel.replaceChildren(el('span', '', `${c.flag} ${c.name}`));
    setTimeout(spin, 45 + i * i * 0.9);
    i++;
  };
  spin();
}

function rank(p) {
  const x = Math.round(p * 100);
  if (x < 10) return 'among the poorest tenth of the country';
  if (x < 40) return 'in the poorer half of the country';
  if (x < 60) return 'right in the middle of the country';
  if (x < 90) return 'in the richer half of the country';
  return 'among the richest tenth of the country';
}

function startLife() {
  const s = life;
  record(s, { kind: 'birth', text: curly(`You are born in ${s.born.inName}. The Office wishes you luck, which is not in its remit.`) });
  $('log').replaceChildren();
  s.shown = 0;
  show('life');
  renderLife();
}

// --- life
function renderLife() {
  const s = life;
  $('fileNo').textContent = `File ${s.ticket}`;
  $('whoFlag').textContent = s.c.flag;
  $('whoName').textContent = s.name;
  $('ageNum').textContent = s.age;

  const dl = $('lifeFields');
  dl.replaceChildren();
  field(dl, 'Lives in', s.c.name + (s.c !== s.born ? ` (born in ${s.born.inName})` : ''));
  field(dl, s.job || s.age >= 15 ? 'Income' : 'Household', `${money(income(s))} a year`);
  field(dl, 'Occupation', s.retired ? `retired ${s.job}` : s.job || (s.uni ? 'university student' : s.inSchool ? 'pupil' : s.age < 6 ? 'baby, full time' : 'none on file'));
  if (s.partner || s.kids) field(dl, 'Family', [s.partner && `${s.married ? 'married to' : 'with'} ${s.partner}`, s.kids && `${s.kids} ${s.kids > 1 ? 'children' : 'child'}`].filter(Boolean).join(', '));

  $('gauges').replaceChildren(...STATS.map(k => {
    const v = Math.round(s.st[k]);
    const g = el('div', 'gauge');
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', `${k} ${v} out of 100`);
    g.append(el('span', 'g-name', k[0].toUpperCase() + k.slice(1)));
    const cells = el('span', 'g-cells');
    for (let i = 0; i < 10; i++) cells.append(el('i', i < Math.round(v / 10) ? 'on' : ''));
    g.append(cells, el('span', 'g-num', v));
    return g;
  }));

  const young = s.age < 6;
  $('focusBox').disabled = young;
  $('focusOpts').replaceChildren(...(young ? [el('p', 'focus-note', 'Until you are 6, your focus is chosen for you: naps.')] : FOCUS.map(([id, label]) => {
    const b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(s.focus === id));
    b.onclick = () => { s.focus = s.focus === id ? null : id; renderLife(); };
    return b;
  })));
  cohortList($('lifeCohort'), s, false);

  // new register entries, newest on top
  const log = $('log');
  for (; s.shown < s.log.length; s.shown++) log.prepend(entryNode(s.log[s.shown]));

  renderQuestion();
  $('nextBtn').disabled = !!s.pending || busy;
  $('hint').textContent = s.pending ? 'The Office is waiting for your answer' : 'Space also advances a year';
}

const FX_NAMES = { health: 'health', happiness: 'happiness', knowledge: 'knowledge', bonds: 'bonds' };
function entryNode(e) {
  const li = el('li', `entry entry-${e.kind}`);
  li.append(el('span', 'e-age', e.age));
  const body = el('div', 'e-body');
  if (e.q) {
    body.append(el('p', 'e-q', e.q));
    body.append(el('p', 'e-a', e.a));
  }
  if (e.kind === 'echo') body.append(el('span', 'tag', 'It comes back'));
  body.append(el('p', 'e-text', e.text));
  if (e.care) body.append(el('p', 'e-care', 'If any of this is close to how you feel in your own life, please talk to someone you trust, or find a helpline near you at findahelpline.com.'));
  if (e.fx && e.fx.length) {
    const fx = el('p', 'e-fx');
    for (const [k, d] of e.fx) {
      fx.append(el('span', d < 0 ? 'down' : 'up', k === 'income' ? `${d < 0 ? '−' : '+'}${money(Math.abs(d))} income` : `${d < 0 ? '−' : '+'}${Math.abs(d)} ${FX_NAMES[k]}`));
    }
    body.append(fx);
  }
  li.append(body);
  return li;
}

function renderQuestion() {
  const s = life, slot = $('questionSlot'), q = s.pending;
  if (!q) { slot.replaceChildren(); return; }
  if (slot.dataset.for === `${s.age}:${q.text}` && slot.firstChild) return;   // keep what is being typed
  slot.dataset.for = `${s.age}:${q.text}`;

  const card = el('div', 'question');
  card.append(el('p', 'formno', `Form Q-${s.age}`), el('p', 'q-text', q.text));
  const opts = el('div', 'q-opts');
  q.labels.forEach((label, i) => {
    const b = el('button', 'btn q-opt', label);
    b.type = 'button';
    b.onclick = () => (q.kind === 'decision' ? resolvePreset(i) : resolveFree(label, false));
    opts.append(b);
  });
  if (q.labels.length) card.append(opts);

  if (AI.on) {
    const form = el('form', 'q-free');
    const label = el('label', '', q.labels.length ? 'Or answer in your own words' : 'Answer in your own words');
    label.htmlFor = 'freeAnswer';
    const ta = el('textarea');
    ta.id = 'freeAnswer'; ta.rows = 3; ta.maxLength = 400;
    ta.placeholder = 'Say what you actually do. The Office will work out the consequences.';
    const send = el('button', 'btn btn-primary', 'File this answer');
    send.type = 'submit';
    form.append(label, ta, send);
    if (q.kind === 'interview') {
      const skip = el('button', 'btn btn-quiet', 'Decline to answer');
      skip.type = 'button';
      skip.onclick = () => { record(s, { kind: 'choice', q: q.text, a: 'No comment.', text: 'The Office records your silence. It has a box for that.' }); s.pending = null; afterAnswer(); };
      form.append(skip);
    }
    form.onsubmit = ev => { ev.preventDefault(); const v = ta.value.trim(); if (v) resolveFree(v, true); else ta.focus(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) form.requestSubmit(); };
    card.append(form);
  } else {
    card.append(el('p', 'q-off', 'Written answers are switched off: this copy of the game is running without its AI referee.'));
  }
  card.append(el('p', 'q-status', ''));
  slot.replaceChildren(card);
  if (!auto) (card.querySelector('.q-opt') || card.querySelector('textarea'))?.focus({ preventScroll: true });
}

function resolvePreset(i) {
  if (busy) return;
  choose(life, i);
  afterAnswer();
}

async function resolveFree(answer, typed) {
  if (busy) return;
  const s = life, card = document.querySelector('.question');
  const status = card.querySelector('.q-status');
  busy = true;
  card.classList.add('waiting');
  for (const c of card.querySelectorAll('button, textarea')) c.disabled = true;
  status.textContent = 'The Office is processing your answer…';
  $('nextBtn').disabled = true;
  try {
    const verdict = await askReferee(s, answer);
    if (life !== s) return;
    applyVerdict(s, verdict, answer, typed);
    busy = false;
    afterAnswer();
  } catch (err) {
    busy = false;
    if (life !== s) return;
    card.classList.remove('waiting');
    for (const c of card.querySelectorAll('button, textarea')) c.disabled = false;
    status.textContent = `${err.message} Your answer is still here: try again, or pick an option.`;
  }
}

function afterAnswer() {
  $('questionSlot').dataset.for = '';
  if (!life.alive) return finish();
  renderLife();
  $('nextBtn').focus({ preventScroll: true });
  schedule();
}

function step() {
  const s = life;
  if (!s || !s.alive || s.pending || busy) return;
  advance(s);
  if (!s.alive) return finish();
  renderLife();
  schedule();
}

function schedule() {
  clearTimeout(timer);
  if (auto && life && life.alive && !life.pending) timer = setTimeout(step, fast ? 380 : 1300);
}

function setAuto(on) {
  auto = on;
  $('autoBtn').setAttribute('aria-pressed', String(on));
  $('autoBtn').textContent = on ? 'Pause' : 'Auto';
  schedule();
}

// --- end
function finish() {
  const s = life;
  setAuto(false);
  renderLife();
  const lives = store.get('lifeahead.lives', []);
  lives.unshift({ name: s.name, flag: s.born.flag, country: s.born.name, age: s.age, cause: s.cause, verdict: s.verdict });
  store.set('lifeahead.lives', lives.slice(0, 20));

  $('verdictStamp').textContent = s.verdict;
  $('epitaph').textContent = curly(s.epitaph);
  const dl = $('endFields');
  dl.replaceChildren();
  const le = lifeExp(s.born, s.sex), diff = Math.round(s.age - le);
  field(dl, 'Name', s.name);
  field(dl, 'Born', `${s.born.flag} ${s.born.name}, ${rank(s.pct)}`);
  field(dl, 'Died', `${s.age ? `aged ${s.age}` : 'in the first year'}${s.c !== s.born ? `, in ${s.c.inName}` : ''}, of ${s.cause}`);
  field(dl, 'Against the table', diff === 0 ? `exactly the local life expectancy of ${le}` : `${Math.abs(diff)} years ${diff > 0 ? 'more' : 'fewer'} than the local life expectancy of ${le}`);
  if (s.age >= 15) field(dl, 'Occupation', s.job ? (s.retired ? `retired ${s.job}` : s.job) : 'none on file');
  if (s.age >= 15) field(dl, 'Last income', `${money(income(s))} a year`);
  if (s.partner || s.kids) field(dl, 'Family', [s.partner && `${s.married ? 'married to' : 'with'} ${s.partner}`, s.kids && `${s.kids} ${s.kids > 1 ? 'children' : 'child'}`].filter(Boolean).join(', '));
  field(dl, 'Final marks', STATS.map(k => `${k} ${Math.round(s.st[k])}`).join(', '));
  field(dl, 'Office score', `${s.score} out of 100`);

  $('badgesBox').hidden = !s.badges.length;
  $('badges').replaceChildren(...s.badges.map(([name, why]) => {
    const li = el('li');
    li.append(el('b', '', name), el('span', '', why));
    return li;
  }));
  cohortList($('endCohort'), s, true);

  const real = COUNTRY_BY_CODE[store.get('lifeahead.real', '')];
  $('compareBox').hidden = !real;
  if (real) {
    const rle = lifeExp(real, s.sex);
    $('compare').textContent = real === s.born
      ? `You drew your own country. The odds of that were 1 in ${Math.max(2, Math.round(TOTAL_BIRTHS / real.births)).toLocaleString('en-US')}.`
      : `A ${s.sex === 'F' ? 'girl' : 'boy'} born in ${real.inName} can expect ${rle} years, against ${le} in ${s.born.inName}, and lives in a country ${ratio(real.gdp, s.born.gdp)}. ${Math.round(real.u5 * 1000)} children in 1,000 die before five there; ${Math.round(s.born.u5 * 1000)} in ${s.born.inName}.`;
  }
  show('end');
  const stamp = $('verdictStamp');
  stamp.classList.remove('thud'); void stamp.offsetWidth; stamp.classList.add('thud');
}

function ratio(a, b) {
  const r = a / b;
  if (r >= 1.15) return `${r >= 10 ? Math.round(r) : r.toFixed(1)} times richer per person`;
  if (r <= 0.87) return `${1 / r >= 10 ? Math.round(1 / r) : (1 / r).toFixed(1)} times poorer per person`;
  return 'about as rich per person';
}

function summary(s) {
  return [
    `LifeAHead, file ${s.ticket}`,
    `${s.name}, born in ${s.born.inName} (${rank(s.pct)}).`,
    `Died ${s.age ? `aged ${s.age}` : 'in the first year'} of ${s.cause}. Local life expectancy: ${lifeExp(s.born, s.sex)}.`,
    s.job ? `Occupation: ${s.job}. Last income: ${money(income(s))} a year.` : null,
    `Verdict of the Office: ${s.verdict} (${s.score}/100).`,
    `"${s.epitaph}"`,
  ].filter(Boolean).join('\n');
}

// --- wiring
function init() {
  const seed = new URLSearchParams(location.search).get('seed');
  if (seed) seedRandom(Number(seed) || 1);

  renderHome();
  $('bornBtn').onclick = startBirth;
  $('startBtn').onclick = startLife;
  $('nextBtn').onclick = step;
  $('autoBtn').onclick = () => setAuto(!auto);
  $('speedBtn').onclick = () => { fast = !fast; $('speedBtn').textContent = `Speed: ${fast ? 'fast' : 'normal'}`; schedule(); };
  $('againBtn').onclick = startBirth;
  $('homeBtn').onclick = () => { renderHome(); show('home'); };
  $('brand').onclick = ev => { ev.preventDefault(); setAuto(false); life = null; renderHome(); show('home'); };
  $('realCountry').onchange = ev => store.set('lifeahead.real', ev.target.value);
  $('clearPast').onclick = () => { store.set('lifeahead.lives', []); renderPast(); };
  $('copyBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(summary(life)); $('copyBtn').textContent = 'Summary copied'; }
    catch { $('copyBtn').textContent = 'Copying is blocked here'; }
    setTimeout(() => { $('copyBtn').textContent = 'Copy summary'; }, 2200);
  };

  document.addEventListener('keydown', ev => {
    if ($('life').hidden || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tag = ev.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'INPUT') return;
    if (life && life.pending && life.pending.kind === 'decision' && /^[1-9]$/.test(ev.key)) {
      const i = Number(ev.key) - 1;
      if (i < life.pending.labels.length) { ev.preventDefault(); resolvePreset(i); }
    } else if (ev.key === ' ' && tag !== 'BUTTON' && tag !== 'SUMMARY') { ev.preventDefault(); step(); }
  });

  fetch('api/status').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(st => {
    AI.on = !!st.ai; AI.mock = !!st.mock;
    const badge = $('aiStatus');
    badge.textContent = AI.mock ? 'Referee: rehearsal mode' : AI.on ? 'Referee on duty' : 'Referee off duty';
    badge.classList.toggle('off', !AI.on);
    badge.title = AI.on ? 'Written answers are read by an AI referee.' : 'No AI key on the server: only the listed options can be chosen.';
  });
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
if (typeof module !== 'undefined') module.exports = { newLife, advance, choose, applyVerdict, deathProb, lifeExp, seedRandom, AI, contextFor };
