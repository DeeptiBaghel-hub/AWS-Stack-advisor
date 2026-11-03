# Contributing to StackSage

We welcome contributions! Please follow these guidelines to keep the project consistent and maintain high quality.

## Getting Started
1. **Fork** the repository and **clone** your fork.
   ```bash
   git clone https://github.com/<your-username>/AWS-Stack-advisor.git
   cd AWS-Stack-advisor
   ```
2. **Install dependencies** for the backend and frontend.
   ```bash
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```
3. **Set up environment** files.
   - Copy `.env.example` to `.env` in `backend/` and fill in `MONGO_URI` and `JWT_SECRET`.
   - Copy `frontend/.env.example` to `frontend/.env` if you need to override defaults.
4. **Run the application** locally.
   ```bash
   # Start backend
   cd backend && npm run dev
   # In a new terminal, start frontend
   cd frontend && npm run dev
   ```

## Workflow
1. **Create a branch** for your feature or bugfix.
   ```bash
   git checkout -b <feature-or-bug-name>
   ```
2. **Make changes** following the project's coding style (eslint + prettier).
3. **Add tests** for new functionality or bug fixes. Run all tests to ensure they pass.
   ```bash
   cd backend && npm test && cd ..
   cd frontend && npm test && cd ..
   ```
4. **Commit** using conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code restructuring without functional changes
5. **Push** your branch and open a **Pull Request**.
   - Ensure the PR description references the related issue (e.g., `Fixes #12`).
   - The CI workflow will run unit, integration, and E2E tests automatically.

## Code Style
- **JavaScript/TypeScript**: Use `eslint` with the Airbnb base config. Run `npm run lint` to check.
- **Formatting**: Use `prettier`. Run `npm run format` before committing.
- **Commit messages**: Follow the Conventional Commits specification.

## Testing
- **Unit tests** are located in `backend/src/utils/*.test.js` and `frontend/src/**/*.test.js`.
- **Integration tests** run against an in‑memory MongoDB (`npm run test:integration`).
- **End‑to‑end tests** are in the `e2e/` directory and use Playwright.

## Reporting Issues
If you encounter a bug or have a feature request, please open an issue with:
- A clear title
- Steps to reproduce (for bugs)
- Desired outcome
- Any relevant screenshots or logs

Thank you for contributing! 🎉
