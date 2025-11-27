<div align="center">
  <img src="public/logo_app_icon.png" alt="SHaiPT Logo" width="200">
  <h1>SHaiPT - AI Personal Trainer</h1>
</div>

**SHaiPT** is a cutting-edge AI-powered personal training application designed to help users build personalized workout routines, track their progress, and receive intelligent coaching. Built with modern web technologies, SHaiPT leverages generative AI to provide a tailored fitness experience.

## 🚀 Features

-   **AI Workout Planning**: Generate personalized workout plans based on your goals and fitness level.
-   **Intelligent Coaching**: Receive real-time feedback and adjustments to your routine.
-   **Progress Tracking**: Monitor your gains with detailed analytics and logs.
-   **Exercise Library**: Access a comprehensive database of exercises with visual guides.
-   **Role-Based Access**: Distinct interfaces for Trainees and Trainers.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database & Auth**: [Supabase](https://supabase.com/)
-   **AI & ML**: Google Generative AI, MediaPipe
-   **Styling**: CSS Modules / Vanilla CSS
-   **Testing**: Jest, React Testing Library, Playwright

## 🏁 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

-   **Node.js**: Version 20 or higher.
-   **pnpm**: Version 9 or higher (recommended package manager).

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
    Copy the example environment file and update it with your credentials.
    ```bash
    cp env.example .env.local
    ```
    Open `.env.local` and add your Supabase keys:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

-   **[API Documentation](API.md)**: Details about the backend API endpoints and usage.
-   **[Testing Guide](TESTING.md)**: Comprehensive guide on running Unit, Integration, and E2E tests.

## 🧪 Testing

We maintain high code quality through rigorous testing.

-   **Unit & Integration Tests**: `pnpm test`
-   **E2E Tests**: `pnpm exec playwright test`

For more details, see [TESTING.md](TESTING.md).

## 📂 Project Structure

```
SHaiPT-Next-App/
├── app/                # Next.js App Router pages and layouts
├── components/         # Reusable React components
├── lib/                # Utility functions and Supabase client
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

