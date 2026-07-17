# Edge Kings

Edge Kings is a mobile-first strategy game based on draughts. Play a quick match against Easy, Medium, or Hard computer opponents, create a profile, save one active game, and review recent replays and statistics.

Read the complete [game rules](docs/game-rules.md) and [playtest scenarios](docs/playtest-scenarios.md).

## Technology

- Semantic HTML5 and vanilla JavaScript ES modules
- Tailwind CSS and Vite
- Node.js and Express
- SQLite with Knex migrations
- Secure cookie sessions and Argon2id password hashing
- Vitest, Supertest, and Playwright

## Local setup

Requirements:

- Node.js 20 or newer
- npm

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:5178](http://localhost:5178). The API runs on [http://localhost:3000](http://localhost:3000).

The development email adapter prints verification and password-reset preview links in the API terminal. No external email account is needed.

## Commands

```bash
npm run dev           # Start Vite and Express
npm run db:migrate    # Apply SQLite migrations
npm run lint          # Check JavaScript
npm run format:check  # Check formatting
npm test              # Run unit and API integration tests
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run mobile browser journeys
npm run build         # Create the production client build
npm start             # Start the production API/static server
```

Install Playwright's Chromium browser once before the first end-to-end run:

```bash
npx playwright install chromium
```

## Architecture

- `src/` contains browser views, board interaction, the API client, and the AI Web Worker.
- `server/` contains Express routes, account security, sessions, email previews, and persistence.
- `shared/` contains the deterministic game engine, computer search, and validation schemas.
- `migrations/` owns database changes.
- `tests/` contains rules, AI, API, and mobile browser coverage.

The game engine is UI-independent and serializable. This keeps rule tests deterministic and prepares the project for a later server-authoritative online mode.

## Security notes

- Passwords are hashed with Argon2id.
- Authentication uses server-side sessions in HTTP-only, same-site cookies.
- State-changing requests require a session-bound CSRF token.
- Authentication and recovery endpoints are rate limited.
- Email addresses remain private.
- Set a strong `SESSION_SECRET` and HTTPS before deployment.

## Candidate workflow

Work on a feature branch in your fork. Keep commits focused, do not push until local checks pass, then open a pull request into `PropaySystems/ai-test:master`.
