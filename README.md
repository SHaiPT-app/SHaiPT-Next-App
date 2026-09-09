<div align="center">
  <img src="public/logo_app_icon.png" alt="SHaiPT Logo" width="200">
  <h1>SHaiPT - AI Personal Trainer</h1>
</div>

**SHaiPT** is a cutting-edge AI-powered personal training application designed to help users build personalized workout routines, track their progress, and receive intelligent coaching. Built with modern web technologies, SHaiPT leverages generative AI to provide a tailored fitness experience.

## 🏁 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

1.  **Node.js** (v20+):
    *   Download and install from [nodejs.org](https://nodejs.org/).
    *   Verify installation:
        ```bash
        node -v
        ```

2.  **pnpm** (v9+):
    *   Once Node.js is installed, install pnpm globally:
        ```bash
        npm install -g pnpm
        ```
    *   Verify installation:
        ```bash
        pnpm -v
        ```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SHaiPT-app/SHaiPT-Next-App.git
    cd SHaiPT-Next-App
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file and fill it in. `env.example` documents every variable
    and says which are required.
    ```bash
    cp env.example .env.local
    ```
    The minimum for a working app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (for the migration runner) and
    `OPENAI_API_KEY`. Without a key, or with `AI_MOCK=1`, the AI gateway answers with canned
    replies outside production, so the whole app still runs.

4.  **Set up the database:**
    ```bash
    pnpm db:migrate            # applies supabase/migrations in order; --status to inspect
    pnpm db:seed:exercises     # 876 exercises, 36 mapped to 4Dcoach
    pnpm db:seed:foods         # 384 USDA foods, per 100 g
    pnpm db:rls-check          # proves nobody can read anyone else's rows
    ```
    [DATABASE.md](DATABASE.md) is the full guide, including how to rebuild from scratch.

5.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser. Sign-up is invite
    only; create an account with `pnpm db:test-users -- you@example.com` (see
    [TESTERS.md](TESTERS.md)).

## 🚀 Features

-   **AI Workout Planning**: An interview with one of eleven coaches, a split, then a plan built
    from the real exercise library — the model picks ids, the server joins the names.
-   **Intelligent Coaching**: A streamed chat that knows your plan, your last three workouts and
    your macro targets, and a weekly insight. Every call goes through one gateway with per-user
    daily limits and a monthly budget.
-   **Nutrition**: Macro targets by arithmetic, meals from a USDA food table with
    server-computed macros, a grocery list, and daily food logging.
-   **Progress Tracking**: Volume, strength, muscle-group and body-weight charts, a frequency
    heatmap, personal records and workout history.
-   **4Dcoach**: Film a set on a phone and get a 4D replay, reps, tempo and a technique score.
    Mapped exercises link straight to it (`#live=<exercise>`).
-   **Role-Based Access**: A trainer's roster, client progress, plan assignment and direct
    messages — all gated by an accepted coaching relationship in the database, not the client.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database & Auth**: [Supabase](https://supabase.com/)
-   **AI**: OpenAI (`gpt-5-nano` for chat and summaries, `gpt-5-mini` for plans and nutrition)
    behind `lib/ai/gateway.ts` — the one door to the model
-   **Styling**: Tailwind CSS on the design tokens in `app/globals.css`
-   **Testing**: Jest, React Testing Library, Playwright

## 📚 Documentation

-   **[API Documentation](API.md)**: Every route, what it takes and what it answers.
-   **[Database](DATABASE.md)**: Schema, row-level security, migrations and seeds.
-   **[Handing SHaiPT to testers](TESTERS.md)**: Accounts, limits, reading the AI spend, what is
    switched off and why.
-   **[Testing Guide](TESTING.md)**: Comprehensive guide on running Unit, Integration, and E2E tests.

## 🧪 Testing

We maintain high code quality through rigorous testing.

-   **Unit & Integration Tests**: `pnpm test`
-   **E2E Tests**: `pnpm exec playwright test` — `e2e/access.spec.ts` needs no database;
    `tester-journey` and `trainer-loop` walk the real loops and skip themselves without the
    test-account variables in `.env.local`. `PLAYWRIGHT_BASE_URL` points a run at a deployment.

For more details, see [TESTING.md](TESTING.md).

## 📂 Project Structure

```
SHaiPT-Next-App/
├── app/                # Next.js App Router pages and layouts
├── components/         # Reusable React components
├── lib/                # Supabase clients, auth helpers, the AI gateway (lib/ai)
├── scripts/            # Migration runner, seeds, RLS check, test accounts
├── supabase/migrations # Schema and policies, applied in order by pnpm db:migrate
├── __tests__/          # Unit and Integration tests
├── e2e/                # Playwright End-to-End tests
├── public/             # Static assets
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a Pull Request.

## 📄 License

Copyright (c) 2025 SHaiPT. All Rights Reserved.

This project is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
