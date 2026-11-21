/* LifeAHead - written content: yearly events, decisions, interviews, endings.
   Placeholders: {name} {partner} {country} {job}.
   Effects (e): health, happiness, knowledge, bonds (points), income (multiplier). */

const rich = s => s.c.gdp >= 25000;
const poor = s => s.c.gdp < 6000;
const working = s => !!s.job && !s.retired;
const parent = s => s.kids > 0;

// ---------- Things that simply happen ------------------------------------------------
const EVENTS = [
  // 0-2
  { a: [0, 2], t: 'You cry for four hours without filing a valid reason.', e: { bonds: -1 } },
  { a: [1, 2], t: 'First word: "no". The Office notes an early talent for negotiation.', e: { knowledge: 2 } },
  { a: [0, 2], t: 'You attempt to eat an object that is not food. Attempt closed without follow-up.', e: { health: -1 } },
  { a: [1, 2], t: 'First steps, then first fall. In that order.', e: { health: 1 } },
  { a: [0, 2], t: 'An aunt pinches your cheeks for eleven minutes. No appeal is possible.', e: { bonds: 2 } },
  { a: [0, 2], t: 'You sleep through the night. Your parents weep with joy, then fall asleep mid-sob.', e: { happiness: 2 } },
  { a: [0, 2], if: poor, t: 'A lean season. The family skips some meals; you get the best share anyway.', e: { health: -3, bonds: 2 } },
  { a: [0, 2], if: rich, t: 'You are given a certified developmental toy. You prefer the box.', e: { happiness: 2 } },

  // 3-11
  { a: [3, 7], t: 'You ask "why?" 312 times in one day. A regional record.', e: { knowledge: 3 } },
  { a: [3, 11], t: 'You make a best friend by sharing a biscuit. The treaty still holds.', e: { bonds: 4 } },
  { a: [5, 8], t: 'You lose a tooth. The local tooth authority pays a rate unrelated to inflation.', e: { happiness: 1 } },
  { a: [4, 11], t: 'You learn to swim, or at least to not sink.', e: { health: 2 } },
  { a: [6, 11], if: s => s.inSchool, t: 'Top marks in arithmetic. You begin to suspect the adults are improvising.', e: { knowledge: 3 } },
  { a: [6, 11], if: s => s.inSchool, t: 'The teacher confiscates an item. It joins the archives.', e: { happiness: -1 } },
  { a: [6, 11], if: s => !s.inSchool, t: 'While others sit in class, you learn a real trade: minding younger siblings.', e: { knowledge: 1, bonds: 2 } },
  { a: [3, 11], t: 'A childhood illness. One week in bed, three days of it expertly faked.', e: { health: -2 } },
  { a: [3, 11], if: poor, t: 'Malaria. You pull through, a few kilos lighter.', e: { health: -6 } },
  { a: [4, 11], t: 'You adopt an animal without consulting family management.', e: { happiness: 3, bonds: 1 } },
  { a: [4, 9], t: 'You tell your first successful lie. The Office disapproves and takes notes.', e: { knowledge: 1 } },
  { a: [5, 11], t: 'You win a race against your cousins. The cousins dispute the result.', e: { health: 2 } },
  { a: [6, 11], t: 'A scuffle in the yard. You lose, but with style.', e: { health: -1, bonds: 1 } },
  { a: [5, 11], if: s => !s.urban, t: 'You can now identify a goat in a bad mood. An underrated skill.', e: { knowledge: 2 } },
  { a: [5, 11], if: s => s.urban, t: 'You know every car horn in the neighbourhood and what each one means.', e: { knowledge: 1 } },

  // 12-17
  { a: [12, 15], t: 'Your voice changes register in the middle of a sentence. Three witnesses.', e: { happiness: -1 } },
  { a: [13, 17], t: 'First love. It lasts nine days and occupies 40% of your thoughts for a year.', e: { happiness: 3 } },
  { a: [13, 17], t: 'You decide nobody understands you. The Office understands you, but says nothing.', e: { happiness: -2 } },
  { a: [12, 17], t: 'You discover music your parents hate. You adopt it on the spot.', e: { happiness: 3 } },
  { a: [13, 17], t: 'A spot appears on your forehead on an important day. Timing verified: worst possible.', e: { happiness: -1 } },
  { a: [12, 17], if: s => s.inSchool, t: 'You revise the night before. Regrettably, the method works.', e: { knowledge: 3 } },
  { a: [12, 17], if: s => s.inSchool, t: 'A teacher believes in you. It appears in no statistic, and it counts.', e: { knowledge: 4, happiness: 2 } },
  { a: [12, 17], if: s => s.c.gdp > 3000, t: 'You save for months for a phone. The screen cracks on day two.', e: { happiness: -1 } },
  { a: [12, 17], t: 'You learn to cook one dish. Exactly one. You will serve it for twenty years.', e: { knowledge: 1, health: 1 } },
  { a: [12, 17], t: 'Neighbourhood football final: you score against your own side, but what a strike.', e: { bonds: 2 } },
  { a: [14, 17], t: 'You stay up all night fixing the world with friends. The world reports no change.', e: { bonds: 4 } },
  { a: [12, 17], if: s => poor(s) && !s.urban, t: 'You work the fields after dawn and before dusk. Your hands are ten years older than you.', e: { health: -2 } },
  { a: [12, 17], t: 'You keep a diary. The Office has read it. It is very well written.', e: { knowledge: 2 } },

  // 18-29
  { a: [18, 29], t: 'You move into a home whose main quality is that it exists.', e: { happiness: 1 } },
  { a: [20, 29], t: 'Three weddings this year. Your gift budget requests asylum.', e: { bonds: 3, income: 0.98 } },
  { a: [18, 29], if: working, t: "Your boss praises you in public for a colleague's work. You let it happen.", e: { income: 1.05 } },
  { a: [18, 49], if: working, t: 'A two-hour meeting that could have been a message. You age two hours.', e: { happiness: -1 } },
  { a: [18, 45], t: 'You take up exercise. Duration of commitment: eleven days.', e: { health: 1 } },
  { a: [18, 45], t: 'You take up exercise, and keep it up. The Office is as surprised as you are.', e: { health: 5 } },
  { a: [18, 40], t: 'A friend borrows money. The Office files the sum under "gifts".', e: { bonds: 1, income: 0.98 } },
  { a: [18, 29], t: 'You dance all night at a party. Your knees lodge a first complaint.', e: { happiness: 4, health: -1 } },
  { a: [18, 29], if: s => !s.partner, t: 'Heartbreak. You play the same song 214 times.', e: { happiness: -5 } },
  { a: [18, 60], if: s => s.partner, t: '{partner} and you argue about nothing, then lose track of the nothing halfway through.', e: { bonds: 1 } },
  { a: [18, 35], t: 'You pick up a foreign language from customers and television. Mostly the insults.', e: { knowledge: 3 } },
  { a: [18, 35], t: 'You fall ill far from home. Someone makes you soup. You will not forget it.', e: { bonds: 3, health: -1 } },
  { a: [20, 40], if: rich, t: 'You assemble flat-pack furniture. Four screws remain. The furniture stands, out of politeness.', e: { happiness: 1 } },
  { a: [18, 40], if: poor, t: 'Six days without electricity. You rediscover the stars and conversation.', e: { bonds: 2 } },
  { a: [18, 40], if: s => s.c.gdp > 3000, t: 'Your phone falls in water. Bowl of rice. Certified miracle.', e: { happiness: 1 } },
  { a: [18, 35], t: 'You swear to stop putting things off. Starting tomorrow.' },

  // 30-49
  { a: [30, 49], t: 'Your back files a first report. The case will remain open.', e: { health: -2 } },
  { a: [30, 45], t: 'You say "in my day" for the first time. The Office timestamps it.' },
  { a: [25, 49], if: parent, t: 'Your child asks a question you cannot answer. You improvise with confidence.', e: { bonds: 2 } },
  { a: [22, 45], if: parent, t: "A sleepless night over a child's fever. By dawn everyone is fine except you.", e: { health: -1, bonds: 2 } },
  { a: [25, 45], if: parent, t: 'Your child declares you the best person in the world. Valid until adolescence.', e: { happiness: 5 } },
  { a: [28, 55], if: working, t: 'Promotion. More responsibility, roughly the same pay, a better title.', e: { income: 1.12 } },
  { a: [28, 58], if: working, t: 'Your employer "restructures". You are among the things restructured.', e: { income: 0.75, happiness: -5 } },
  { a: [30, 60], t: 'You run into a childhood friend and resume the conversation where it stopped twenty years ago.', e: { bonds: 5 } },
  { a: [30, 70], t: 'You plant a tree. It will outlive you, and it knows.', e: { happiness: 3 } },
  { a: [35, 60], if: rich, t: 'Check-up. The doctor says "hmm". Nothing else. You think about it for three weeks.', e: { health: 1, happiness: -1 } },
  { a: [25, 70], t: 'You repair something yourself. It holds. You will mention it for years.', e: { happiness: 3 } },
  { a: [25, 60], if: working, t: 'A bad year for business. The belt goes in one more notch.', e: { income: 0.85 } },
  { a: [25, 60], if: working, t: 'A good year. Money comes in. You do not know why, so you touch nothing.', e: { income: 1.15 } },
  { a: [30, 65], t: 'You become the person people call when something stops working.', e: { bonds: 4 } },
  { a: [30, 70], t: 'A funeral for someone close. You learn one can laugh and cry within the same hour.', e: { happiness: -4, bonds: 3 } },
  { a: [35, 60], t: 'You catch yourself enjoying silence.', e: { happiness: 2 } },
  { a: [30, 70], if: s => s.smoker, t: 'You cough in the mornings. You blame the weather.', e: { health: -3 } },

  // 50-64
  { a: [45, 60], t: 'You need glasses to read. Your arms are no longer long enough.' },
  { a: [50, 75], t: 'People ask your advice. You give it. Nobody follows it; everybody thanks you.', e: { bonds: 2 } },
  { a: [50, 70], if: parent, t: 'Your children explain a device to you. Slowly. In that tone.', e: { happiness: -1, knowledge: 1 } },
  { a: [48, 70], if: parent, t: 'You become a grandparent: full rights to spoil the child, then hand it back.', e: { happiness: 6, bonds: 4 } },
  { a: [50, 80], t: 'Your knee forecasts rain more reliably than the national weather service.', e: { health: -2 } },
  { a: [50, 80], t: 'You start a vegetable patch. The tomatoes become a topic of conversation.', e: { happiness: 3, health: 1 } },
  { a: [50, 90], t: 'You tell the same story for the fortieth time. It improves with each version.', e: { bonds: 1 } },
  { a: [50, 70], if: rich, t: 'Blood test: everything is "within range for your age". You note the qualifier.' },
  { a: [50, 64], if: working, t: 'A younger colleague calls you "a pillar". You choose to take it well.', e: { happiness: 1 } },

  // 65+
  { a: [65, 120], t: 'The nap becomes an appointment you never miss.', e: { health: 1 } },
  { a: [65, 120], t: 'You beat the whole street at cards. They suspect you. Correctly.', e: { happiness: 3, bonds: 2 } },
  { a: [65, 120], t: 'You read the obituaries first. Confirmed: you are not in them.' },
  { a: [65, 120], if: parent, t: 'A grandchild asks what things were like "before". You exaggerate slightly. Considerably.', e: { bonds: 4 } },
  { a: [70, 120], t: 'You forget why you walked into the room. The room offers no help.', e: { knowledge: -1 } },
  { a: [65, 120], t: 'Your daily walk. The neighbours set their watches by it.', e: { health: 2 } },
  { a: [68, 120], t: 'A fall. Nothing broken, apart from some pride.', e: { health: -4 } },
  { a: [65, 120], t: 'You give your opinion on everything, aloud, in public places. It is an acquired right.', e: { happiness: 2 } },
  { a: [70, 120], t: 'They celebrate your birthday. The cake is a fire hazard.', e: { happiness: 4, bonds: 3 } },
  { a: [70, 120], t: 'You bury one more friend. The guest list for your parties gets shorter.', e: { happiness: -4, bonds: -3 } },
  { a: [65, 120], t: 'You sit in the sun and nothing happens. It is exactly what you wanted.', e: { happiness: 4 } },

  // any age
  { a: [8, 120], rep: true, t: 'A year without incident. The Office has nothing to report, and neither do you.' },
  { a: [10, 120], t: 'It rains on the one day it should not have.' },
  { a: [12, 120], t: 'You find a banknote in an old pocket. Highlight of the quarter.', e: { happiness: 2 } },
];

// ---------- Decisions -----------------------------------------------------------------
// o: options; each has outcomes r: [{ p, t, e, f }] (p = probability, f = extra change).
const DECISIONS = [
  { id: 'toy', a: [4, 7], q: 'A neighbourhood child wants your favourite toy.', o: [
    { l: 'Share it', r: [{ p: 1, t: 'You share. The Office notes a promising start.', e: { bonds: 5, happiness: -1 } }] },
    { l: 'Bite them', r: [{ p: 1, t: 'Effective. Diplomatically expensive.', e: { bonds: -3, happiness: 2 } }] },
    { l: 'Negotiate a swap', r: [
      { p: 0.5, t: 'You trade up. A career in commerce is pencilled in.', e: { knowledge: 3, happiness: 2 } },
      { p: 0.5, t: 'You are swindled by a five-year-old. An education in itself.', e: { knowledge: 3, happiness: -2 } }] },
  ] },
  { id: 'test', a: [8, 11], if: s => s.inSchool, q: 'There is a test tomorrow.', o: [
    { l: 'Revise', r: [{ p: 1, t: 'You revise. It is dull and it works.', e: { knowledge: 4 } }] },
    { l: 'Copy from your neighbour', r: [
      { p: 0.5, t: 'It goes unnoticed. Your neighbour was also wrong.', e: { knowledge: 1 } },
      { p: 0.5, t: 'You are caught. The matter is escalated to your mother.', e: { happiness: -3, bonds: -1 } }] },
    { l: 'Fall strategically ill', r: [{ p: 1, t: 'A convincing performance. The test is waiting for you on Monday.', e: { happiness: 1 } }] },
  ] },
  { id: 'wallet', a: [8, 14], q: 'You find a wallet on the ground.', o: [
    { l: 'Return it', r: [
      { p: 0.8, t: 'You return it. The owner thanks you at length.', e: { bonds: 3, happiness: 2 } },
      { p: 0.2, t: 'You return it and receive a reward larger than expected.', e: { bonds: 3, happiness: 4 } }] },
    { l: 'Keep it', r: [{ p: 1, t: 'You keep it. Your conscience opens a file.', e: { happiness: -1, bonds: -2 } }] },
    { l: 'Return it, minus a "handling fee"', r: [{ p: 1, t: 'A compromise. The Office recognises the method.', e: { knowledge: 1 } }] },
  ] },
  { id: 'hobby', a: [10, 15], q: 'You have spare hours. What do you fill them with?', o: [
    { l: 'Sport', r: [{ p: 1, t: 'You run, kick and climb. Your lungs approve.', e: { health: 5, bonds: 2 } }] },
    { l: 'Music', r: [{ p: 1, t: 'You practise. The neighbours endure the first two years.', e: { happiness: 4, knowledge: 2 } }] },
    { l: 'Nothing, but thoroughly', r: [{ p: 1, t: 'You do nothing with real dedication.', e: { happiness: 2 } }] },
  ] },
  { id: 'school12', a: [12, 12], must: true, if: s => s.inSchool && (s.fam < 0.8 || s.c.school < 6.5) && s.c.gdp < 12000,
    q: 'The family needs another pair of hands, and school costs money.', o: [
    { l: 'Stay in school', r: [
      { p: 0.7, t: 'You stay. The family tightens its budget around your satchel.', e: { knowledge: 3, bonds: -1 } },
      { p: 0.3, t: 'You try to stay, but the fees win. You leave school at twelve.', e: { happiness: -4 }, f: s => leaveSchool(s, 0) }] },
    { l: 'Go to work', r: [{ p: 1, t: 'You leave school and start earning.', e: { happiness: -2, bonds: 3 }, f: s => leaveSchool(s, 0) }] },
    { l: 'Do both', r: [{ p: 1, t: 'Class in the morning, work until dark. You fall asleep on both.', e: { knowledge: 2, health: -5, bonds: 2 } }] },
  ] },
  { id: 'cigarette', a: [14, 17], q: 'Someone offers you a first cigarette.', o: [
    { l: 'Refuse', r: [{ p: 1, t: 'You decline. Your lungs send their thanks.', e: { health: 1 } }] },
    { l: 'Accept', r: [{ p: 1, t: 'You cough, then pretend you did not. A habit is filed.', e: { bonds: 3, health: -2 }, f: s => { s.smoker = true; } }] },
    { l: 'Cough on purpose to get a laugh', r: [{ p: 1, t: 'It gets the laugh.', e: { bonds: 2 } }] },
  ] },
  { id: 'crush', a: [15, 17], q: 'You like someone.', o: [
    { l: 'Tell them', r: [
      { p: 0.5, t: 'They like you too. For several weeks, gravity is optional.', e: { happiness: 6, bonds: 2 } },
      { p: 0.5, t: 'A polite refusal. The Office has seen worse. Not often.', e: { happiness: -4 } }] },
    { l: 'Write an anonymous poem', r: [{ p: 1, t: 'The poem is admired. Someone else takes the credit.', e: { knowledge: 2, happiness: -1 } }] },
    { l: 'Do nothing for three years', r: [{ p: 1, t: 'You do nothing, with great intensity.', e: { happiness: -1 } }] },
  ] },
  { id: 'work15', a: [15, 16], must: true, if: s => !s.inSchool && !s.job, q: 'It is time to earn a living.', o: [
    { l: 'Take up the family trade', r: [{ p: 1, t: 'You do what your parents do. You are {job}.', e: { bonds: 4 }, f: s => giveJob(s, s.urban ? 1 : 0) }] },
    { l: 'Try your luck in the city', r: [
      { p: 0.55, t: 'The city takes you in. You are {job}.', e: { happiness: 2, bonds: -4 }, f: s => { s.urban = true; giveJob(s, 1); } },
      { p: 0.45, t: 'The city is expensive and uninterested. You scrape by as {job}.', e: { happiness: -3, bonds: -4 }, f: s => { s.urban = true; giveJob(s, 0); } }] },
    { l: 'Start a small business', r: [
      { p: 0.35, t: 'It works. You are, officially, {job} and your own boss.', e: { happiness: 4, knowledge: 3 }, f: s => { giveJob(s, 1); s.mult *= 1.3; } },
      { p: 0.65, t: 'The business folds in a season. You end up {job}.', e: { knowledge: 3, happiness: -2 }, f: s => giveJob(s, 0) }] },
  ] },
  { id: 'after17', a: [17, 18], must: true, if: s => s.inSchool, q: 'Secondary school is over. What now?', o: [
    { l: 'University', r: [
      { p: 0.75, t: 'You are admitted. Four years of lectures and instant noodles begin.', e: { knowledge: 3, happiness: 2 }, f: s => startUniversity(s) },
      { p: 0.25, t: 'The fees, or the entrance exam, say no. You go to work as {job}.', e: { happiness: -4 }, f: s => leaveSchool(s, 1) }] },
    { l: 'Get a job', r: [{ p: 1, t: 'You take your diploma to the job market. You are {job}.', e: { happiness: 1 }, f: s => leaveSchool(s, 1) }] },
    { l: 'Wander for a while', r: [{ p: 1, t: 'A year of odd jobs and long roads. Then you settle as {job}.', e: { happiness: 5, knowledge: 4, bonds: -2 }, f: s => { leaveSchool(s, 1); s.mult *= 0.9; } }] },
  ] },
  { id: 'emigrate', a: [19, 40], if: s => s.c.gdp < 30000 && s.c.code === s.born.code, q: 'A cousin abroad says there is work where they live.', o: [
    { l: 'Go', r: [
      { p: 0.6, t: 'Papers, queues, a long journey. You arrive in {country} and start again from the bottom.', e: { bonds: -10, happiness: -2, knowledge: 4 }, f: s => emigrate(s) },
      { p: 0.4, t: 'The visa is refused. The Office expresses solidarity with a fellow administration.', e: { happiness: -3 } }] },
    { l: 'Stay', r: [{ p: 1, t: 'You stay. Home has its own advantages, one of them being that it is home.', e: { bonds: 3 } }] },
    { l: 'Ask for more details first', r: [{ p: 1, t: 'The details are vague. The cousin is "between opportunities". You wait.', e: { knowledge: 1 } }] },
  ] },
  { id: 'meet', a: [19, 45], rep: 5, if: s => !s.partner, q: s => `${s.suitor} keeps smiling at you.`, setup: s => { s.suitor = partnerName(s); }, o: [
    { l: 'Start a conversation', r: [
      { p: 0.7, t: 'It goes well. {partner} is now part of the file.', e: { happiness: 7, bonds: 5 }, f: s => { s.partner = s.suitor; s.partners++; } },
      { p: 0.3, t: 'The smile was meant for the person behind you.', e: { happiness: -2 } }] },
    { l: 'Flee', r: [{ p: 1, t: 'You leave briskly. The Office respects a clean exit.', e: { happiness: -1 } }] },
    { l: 'Send a friend to investigate', r: [
      { p: 0.5, t: 'The report is favourable. {partner} and you become a couple.', e: { happiness: 6, bonds: 6 }, f: s => { s.partner = s.suitor; s.partners++; } },
      { p: 0.5, t: 'Your friend and the person in question are now a couple.', e: { happiness: -3, bonds: -2 } }] },
  ] },
  { id: 'marry', a: [20, 60], if: s => s.partner && !s.married, q: '{partner} brings up marriage.', o: [
    { l: 'Get married', r: [{ p: 1, t: 'A wedding. Everyone you know attends, and several people you do not.', e: { happiness: 6, bonds: 8, income: 0.9 }, f: s => { s.married = true; } }] },
    { l: 'Not yet', r: [{ p: 1, t: '"Not yet" is entered in the record. {partner} reads the record.', e: { bonds: -2 } }] },
    { l: 'Break up', r: [{ p: 1, t: 'It ends. You divide the belongings and the friends.', e: { happiness: -7, bonds: -5 }, f: s => { s.partner = null; } }] },
  ] },
  { id: 'child', a: [20, 42], rep: 4, if: s => s.partner && s.kids < 6, q: s => s.kids ? 'Another child?' : 'A child?', o: [
    { l: 'Yes', r: [
      { p: 0.8, t: 'A child is born. The Office opens a new file; you stop sleeping.', e: { happiness: 6, bonds: 6, health: -2, income: 0.93 }, f: s => { s.kids++; } },
      { p: 0.2, t: 'It does not happen this year.', e: { happiness: -2 } }] },
    { l: 'Not now', r: [{ p: 1, t: 'Not now. The question will be resubmitted.' }] },
    { l: 'Get an animal instead', r: [{ p: 1, t: 'The animal settles in and takes the best chair.', e: { happiness: 3 } }] },
  ] },
  { id: 'offer', a: [25, 52], if: working, q: 'A better-paid job is offered: far away, under a notoriously difficult boss.', o: [
    { l: 'Accept', r: [{ p: 1, t: 'More money, less of everything else.', e: { income: 1.4, happiness: -5, bonds: -4 } }] },
    { l: 'Refuse', r: [{ p: 1, t: 'You stay put. Your evenings remain your own.', e: { happiness: 2 } }] },
    { l: 'Use it to negotiate', r: [
      { p: 0.4, t: 'Your employer matches most of it. Well played.', e: { income: 1.25 } },
      { p: 0.6, t: 'Your employer wishes you every success in your new position.', e: { income: 0.9, happiness: -3 } }] },
  ] },
  { id: 'startup', a: [24, 52], if: working, q: 'A business idea arrives at three in the morning.', o: [
    { l: 'Quit and build it', r: [
      { p: 0.25, t: 'Against the statistics, it works. You employ people now.', e: { income: 3, happiness: 6 }, f: s => { s.job = 'business owner'; s.tags.founder = true; } },
      { p: 0.45, t: 'It fails slowly, then quickly. You go back to work with a good story.', e: { income: 0.6, knowledge: 4, happiness: -4 } },
      { p: 0.3, t: 'It neither fails nor succeeds. It simply continues, like a cough.', e: { income: 1.1, knowledge: 3 }, f: s => { s.job = 'business owner'; } }] },
    { l: 'Write it down and go back to sleep', r: [{ p: 1, t: 'In the morning the note reads "app but for goats". You let it go.' }] },
    { l: 'Tell everyone and do nothing', r: [{ p: 1, t: 'Two years later someone else does it. You tell everyone that too.', e: { bonds: -1 } }] },
  ] },
  { id: 'slowdown', a: [30, 58], q: s => rich(s) ? 'The doctor suggests you slow down.' : 'An elder tells you that you look worn out, and to slow down.', o: [
    { l: 'Listen', r: [{ p: 1, t: 'You rest. It is unfamiliar and effective.', e: { health: 6, income: 0.95 } }] },
    { l: 'Ignore it', r: [{ p: 1, t: 'You carry on. So does the tiredness.', e: { health: -5, income: 1.05 } }] },
    { l: 'Seek a second opinion', r: [{ p: 1, t: 'The second opinion is the first opinion, in a different voice.', e: { health: 2 } }] },
  ] },
  { id: 'quit', a: [28, 62], if: s => s.smoker, q: 'You consider giving up smoking.', o: [
    { l: 'Quit', r: [
      { p: 0.6, t: 'You quit. Food acquires a taste.', e: { health: 6, happiness: 2 }, f: s => { s.smoker = false; s.tags.quit = true; } },
      { p: 0.4, t: 'You quit for four days. A new personal record.', e: { happiness: -1 } }] },
    { l: 'Carry on', r: [{ p: 1, t: 'You carry on. The packet did warn you.', e: { health: -2 } }] },
  ] },
  { id: 'midlife', a: [38, 52], q: 'You wake up and wonder whether this is it.', o: [
    { l: 'Buy an unreasonable vehicle', r: [{ p: 1, t: 'It is loud and impractical. You love it.', e: { happiness: 4, income: 0.9 } }] },
    { l: 'Train for a long race', r: [{ p: 1, t: 'You finish, slowly, and mention it at every opportunity.', e: { health: 6, happiness: 2 } }] },
    { l: 'Change your haircut', r: [{ p: 1, t: 'Nobody notices. Except the Office.', e: { happiness: 1 } }] },
  ] },
  { id: 'distance', a: [33, 62], if: s => s.partner, q: '{partner} and you now talk only about logistics.', o: [
    { l: 'Plan something together', r: [{ p: 1, t: 'An evening without logistics. You remember why you chose each other.', e: { bonds: 5, happiness: 4 } }] },
    { l: 'Let it drift', r: [
      { p: 0.7, t: 'It drifts, and holds.', e: { happiness: -2 } },
      { p: 0.3, t: 'It drifts apart. {partner} leaves.', e: { happiness: -8, bonds: -6 }, f: s => { s.partner = null; s.married = false; } }] },
    { l: 'Separate', r: [{ p: 1, t: 'You separate. The paperwork is, for once, not the worst part.', e: { happiness: -6, bonds: -5, income: 0.9 }, f: s => { s.partner = null; s.married = false; } }] },
  ] },
  { id: 'parentcare', a: [40, 62], q: 'An ageing parent needs help.', o: [
    { l: 'Take them in', r: [{ p: 1, t: 'They move in, with opinions about how you run a household.', e: { bonds: 8, happiness: -2, income: 0.92 } }] },
    { l: 'Send money', r: [{ p: 1, t: 'You send what you can, every month.', e: { bonds: 3, income: 0.9 } }] },
    { l: 'Go quiet', r: [{ p: 1, t: 'You do not call back. Your conscience opens a file.', e: { bonds: -8, happiness: -3 } }] },
  ] },
  { id: 'election', a: [25, 65], q: 'There is a local election. People suggest you stand.', o: [
    { l: 'Stand', r: [
      { p: 0.3, t: 'You win. You now attend meetings professionally.', e: { bonds: 8, income: 1.3, happiness: 3 }, f: s => { s.tags.elected = true; } },
      { p: 0.7, t: 'You receive fourteen votes, one of them your own.', e: { happiness: -2, bonds: 2 } }] },
    { l: 'Decline', r: [{ p: 1, t: 'You decline. Your evenings are saved.', e: { happiness: 1 } }] },
    { l: 'Spoil your ballot, on principle', r: [{ p: 1, t: 'The principle is noted by nobody.' }] },
  ] },
  { id: 'gamble', a: [18, 45], q: 'A friend has an infallible tip.', o: [
    { l: 'Bet', r: [
      { p: 0.12, t: 'The tip was, astonishingly, good.', e: { income: 1.5, happiness: 5 } },
      { p: 0.88, t: 'The tip was a tip. The money is gone.', e: { income: 0.85, happiness: -3 } }] },
    { l: 'Pass', r: [{ p: 1, t: 'You pass. The friend loses your share too.', e: { happiness: 1 } }] },
  ] },
  { id: 'disaster', a: [22, 62], q: s => poor(s) ? 'Floods take the harvest and half the road.' : 'An economic crisis hits the region hard.', o: [
    { l: 'Stay and rebuild', r: [{ p: 1, t: 'You rebuild. It takes years and most of your savings.', e: { bonds: 5, income: 0.7 } }] },
    { l: 'Move to the next town', r: [{ p: 1, t: 'You start over somewhere that does not know your name.', e: { bonds: -5, income: 0.85 } }] },
    { l: 'Help the neighbours first', r: [{ p: 1, t: 'You help. You lose more than most, and gain a street full of people who would do anything for you.', e: { bonds: 10, income: 0.65, happiness: 3 } }] },
  ] },
  { id: 'scheme', a: [20, 55], q: 'A stranger offers an investment that is "100% safe".', o: [
    { l: 'Invest', r: [
      { p: 0.8, t: 'The stranger and the money leave town together.', e: { income: 0.7, happiness: -4 } },
      { p: 0.2, t: 'It pays out. The Office is unsettled.', e: { income: 1.6, happiness: 4 } }] },
    { l: 'Decline politely', r: [{ p: 1, t: 'You decline. The stranger moves on to your neighbour.' }] },
    { l: 'Sell them something instead', r: [
      { p: 0.5, t: 'You sell them something. The Office is impressed.', e: { income: 1.1, knowledge: 2 } },
      { p: 0.5, t: 'They are better at this than you are.', e: { income: 0.95 } }] },
  ] },
  { id: 'inherit', a: [45, 70], q: s => rich(s) ? 'An uncle leaves you an unexpected sum.' : 'An uncle leaves you three goats and a debt.', o: [
    { l: 'Invest it', r: [
      { p: 0.5, t: 'It grows.', e: { income: 1.25 } },
      { p: 0.5, t: 'It shrinks.', e: { income: 0.95 } }] },
    { l: 'Spend it on one memorable party', r: [{ p: 1, t: 'People will still be talking about it at your funeral.', e: { bonds: 10, happiness: 6 } }] },
    { l: 'Share it with the family', r: [{ p: 1, t: 'You share it. Nobody thinks their share is fair, and everyone comes to dinner.', e: { bonds: 6 } }] },
  ] },
  { id: 'retire', a: [60, 68], must: true, rep: 3, if: s => working(s) && s.c.gdp >= 12000, q: 'Retirement is available.', o: [
    { l: 'Retire', r: [{ p: 1, t: 'You retire. Mondays lose their meaning.', e: { happiness: 5, health: 3, income: 0.6 }, f: s => { s.retired = true; } }] },
    { l: 'Work a little longer', r: [{ p: 1, t: 'You stay on. The Office will ask again.', e: { health: -2 } }] },
  ] },
  { id: 'memoirs', a: [66, 90], q: 'You have a life behind you worth telling.', o: [
    { l: 'Write it down', r: [{ p: 1, t: 'You write your memoirs. Chapter three is disputed by your siblings.', e: { knowledge: 3, happiness: 4 }, f: s => { s.tags.memoirs = true; } }] },
    { l: 'Tell it aloud to whoever passes', r: [{ p: 1, t: 'You tell it, with improvements, to anyone who sits still.', e: { bonds: 5 } }] },
    { l: 'Take it with you', r: [{ p: 1, t: 'You keep it to yourself. Some files stay closed.', e: { happiness: 1 } }] },
  ] },
  { id: 'movein', a: [72, 95], if: parent, q: 'Your children suggest you move in with them.', o: [
    { l: 'Move in', r: [{ p: 1, t: 'You move in. You are never alone again, for better and for louder.', e: { bonds: 8, health: 3, happiness: 1 } }] },
    { l: 'Stay in your own home', r: [{ p: 1, t: 'You stay. The house is quiet and entirely yours.', e: { happiness: 3, bonds: -3 } }] },
  ] },
];

// ---------- Interviews: open questions the Office asks, answered in your own words -----
const INTERVIEWS = [
  { age: 7, q: 'Scheduled review, age 7. What do you want to be when you grow up?' },
  { age: 16, q: 'Scheduled review, age 16. What is the one thing you would change about your life right now, and what will you do about it?' },
  { age: 30, q: 'Scheduled review, age 30. Something is missing from this life. What is it, and what do you do to get it?' },
  { age: 45, q: 'Scheduled review, age 45. You have one free year and no obligations. How do you spend it?' },
  { age: 60, q: 'Scheduled review, age 60. Who do you still owe an apology, a visit or a thank-you, and do you pay it?' },
  { age: 75, q: 'Scheduled review, age 75. What do you do with the time that is left?' },
];

// ---------- Endings ------------------------------------------------------------------
const CAUSES = {
  infantPoor: ['an infection a few tablets would have cured elsewhere', 'complications at birth', 'severe diarrhoea, for want of clean water', 'pneumonia', 'malaria'],
  infantRich: ['complications at birth', 'a heart defect', 'a severe infection'],
  child: ['a road accident', 'an infectious disease', 'drowning'],
  youngPoor: ['a road accident', 'tuberculosis', 'an untreated infection', 'an accident at work', 'malaria'],
  young: ['a road accident', 'an accident at work', 'a sudden illness', 'a fall while picking a fruit that was not worth it'],
  mid: ['a heart attack during a meeting (the meeting continued)', 'cancer', 'a stroke', 'liver disease', 'a road accident'],
  smoker: ['lung cancer. The packet did warn you'],
  old: ['a heart attack during the afternoon nap', 'a stroke', 'cancer', 'pneumonia', 'a bad fall', 'the heart, quite simply. It had done its share'],
  veryOld: ['old age, in your sleep', 'an overambitious burst of laughter', 'old age, halfway through a story everyone already knew'],
};

const EPITAPHS = [
  [s => s.age < 5, 'Did not get the time. The Office expresses its regret, which is rare.'],
  [s => s.age < 18, 'Had barely started. The file is far too thin.'],
  [s => s.age >= 95, 'Outlived every one of their doctors.'],
  [s => s.st.bonds >= 75, 'The funeral was crowded, and the buffet was excellent.'],
  [s => s.st.bonds <= 12, 'At peace, finally, and undisturbed.'],
  [s => s.st.knowledge >= 75, 'Knew a great many things, some of them useful.'],
  [s => s.avgHappy >= 68, 'Found it rather good, on the whole.'],
  [s => s.mult >= 4, 'Took nothing along. Checked twice.'],
  [() => true, 'Did what could be done with the form that was issued.'],
];

const VERDICTS = [
  [0, 'Closed without follow-up'],
  [35, 'Compliant'],
  [50, 'Well lived'],
  [63, 'Remarkable'],
  [76, 'Beyond category'],
];

const BADGES = [
  ['Centenarian', 'Reached 100.', s => s.age >= 100],
  ['Geographic jackpot', 'Born somewhere fewer than 1 baby in 500 is born.', s => s.born.births / TOTAL_BIRTHS < 0.002],
  ['Beat the table', 'Lived 10 years past the local life expectancy.', s => s.age >= lifeExp(s.born, s.sex) + 10],
  ['Self-made', 'Born in the poorer half, ended up earning 3 times the national average.', s => s.fam < 1 && s.mult >= 3],
  ['Full house', 'Raised five or more children.', s => s.kids >= 5],
  ['Expatriate', 'Died in a different country from the one you were issued.', s => s.c.code !== s.born.code],
  ['Graduate', 'Finished university.', s => s.edu === 'university'],
  ['Serial romantic', 'Three or more partners.', s => s.partners >= 3],
  ['Ex-smoker', 'Gave it up for good.', s => !!s.tags.quit],
  ['Founder', 'Built a business that worked.', s => !!s.tags.founder],
  ['Elected', 'Won a local election.', s => !!s.tags.elected],
  ['Memoirist', 'Wrote it all down.', s => !!s.tags.memoirs],
  ['Hermit', 'Ended with almost no bonds.', s => s.age >= 40 && s.st.bonds <= 10],
  ['Pillar of the street', 'Ended with bonds above 90.', s => s.st.bonds >= 90],
  ['Own words', 'Answered the Office in your own words five times.', s => s.freeAnswers >= 5],
];
