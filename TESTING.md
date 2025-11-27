# Testing Documentation

This project employs a comprehensive testing strategy covering Unit, Integration, and End-to-End (E2E) tests to ensure application reliability and correctness.

## Test Structure

- **Unit & Component Tests**: Located in `__tests__/`. Run using Jest.
- **Integration Tests**: Located in `__tests__/api/`. Run using Jest.
- **E2E Tests**: Located in `e2e/`. Run using Playwright.

## Implemented Tests

### 1. Unit & Component Tests
These tests verify individual functions and components in isolation.

- **`__tests__/utils.test.ts`**:
  - Tests utility functions like `cleanExercisesData`.
  - Verifies data transformation logic and handling of edge cases (e.g., undefined values).

- **`__tests__/Home.test.tsx`**:
  - Verifies that the Landing Page renders correctly.
  - Checks for the presence of key components (Hero, Features, Footer).

- **`__tests__/LoginForm.test.tsx`**:
  - Tests the authentication UI.
  - Verifies rendering of Login and Signup forms.
  - Tests switching between modes and form submission logic.
  - Mocks Supabase authentication calls.

- **`__tests__/PlanCreator.test.tsx`**:
  - Tests the Workout Plan Creator component.
  - Verifies form rendering, adding exercises, and input handling.
  - Tests the plan submission flow, mocking API calls and Supabase session.

### 2. Integration Tests
These tests verify that different parts of the application work together, specifically the API routes.

- **`__tests__/api/plans.test.ts`**:
  - Tests the `/api/plans` endpoints (`GET` and `POST`).
  - Verifies that the API correctly handles requests and interacts with the mocked database layer.
  - Ensures correct HTTP status codes and response structures.

### 3. End-to-End (E2E) Tests
These tests simulate real user interactions in a browser environment.

- **`e2e/auth.spec.ts`**:
  - Tests the critical authentication flow.
  - Verifies the application title.
  - Navigates from the landing page to the login page and verifies the UI.

## Running Tests Locally

### Prerequisites
Ensure you have installed dependencies:
```bash
pnpm install
```

### Unit & Integration Tests (Jest)
To run all unit and integration tests:
```bash
pnpm test
```

To run tests in watch mode (useful during development):
```bash
pnpm test:watch
```

### End-to-End Tests (Playwright)
To run E2E tests (requires a running dev server or Playwright will start one):
```bash
pnpm exec playwright test
```

To run E2E tests with UI mode (interactive):
```bash
pnpm exec playwright test --ui
```

## CI/CD Pipeline

We use **GitHub Actions** to automate testing. The workflow is defined in `.github/workflows/ci.yml`.

### Triggers
The CI pipeline runs automatically on:
- `push` events to the `main` branch.
- `pull_request` events targeting the `main` branch.

### Workflow Steps
1.  **Checkout Code**: Pulls the latest code.
2.  **Setup Node.js**: Installs Node.js environment.
3.  **Install Dependencies**: Installs project dependencies using `pnpm`.
4.  **Run Tests**: Executes `pnpm test` to run Unit and Integration tests.
5.  **Build**: Attempts to build the Next.js application to ensure no build errors.

> **Note**: Currently, E2E tests are run locally. Future improvements could include adding Playwright to the CI pipeline.
