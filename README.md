# LifeAHead

A life simulation. You are born at random, in proportion to where babies are really
born, into a family whose income is drawn from that country's real inequality. Then
you live that one life a year at a time.

Every question the game asks ("the Office", a deadpan bureaucracy that administers
lives) can be answered two ways: pick one of the listed options, or **write what you
actually do**. An AI referee reads the written answer, decides what is plausible for
this person in this place, and changes the life accordingly, including consequences
scheduled for later years and follow-up questions that grow out of what you said.

## Run it

```bash
npm install
```

```bash
ANTHROPIC_API_KEY=your-key npm start
```

Then open http://localhost:3000.

Without a key the game still runs; only the listed options can be chosen and the
header shows "Referee off duty". To try the written-answer interface without a key
or any API cost, use the canned referee:

```bash
LIFEAHEAD_MOCK_AI=1 npm start
```

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Key for the referee. Stays on the server, never sent to the browser. |
| `LIFEAHEAD_MODEL` | Model id. Default `claude-opus-5-5`. |
| `LIFEAHEAD_RATE` | Written answers allowed per visitor per minute. Default 30. |
| `LIFEAHEAD_MOCK_AI` | `1` for canned answers and no API calls. |
| `PORT` | Default 3000. |

Each written answer is one API call, so a public deployment spends money per answer.
The per-visitor rate limit is the only brake built in.

## How it works

- `public/js/data.js`: 84 countries (about nine in ten of the world's births) with
  births, life expectancy by sex, under-5 mortality, GDP per person, Gini index,
  schooling and urban share. Rounded orders of magnitude, not a source.
- `public/js/content.js`: yearly events, decisions, scheduled open-question
  interviews, causes of death, epitaphs, commendations.
- `public/js/game.js`: the engine (birth draw, mortality model, yearly loop) and
  the interface. Whatever the referee returns is bounded here before it touches a
  life.
- `server.js`: serves the game and referees written answers through the Anthropic
  API with a structured (schema-checked) reply. If a request is declined on safety
  grounds it is retried on a fallback model inside the same call, and if that also
  declines, the game files a neutral outcome.

```bash
npm test
```

plays thousands of lives with random choices and checks that ages at death track
each country's life expectancy.

## Credits

The idea of a birth lottery weighted by real statistics is in the same genre as
"1 in 8 Billion" (1in8b.life). LifeAHead shares the concept only: its code, text,
data tables and design are its own.
