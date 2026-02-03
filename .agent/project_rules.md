# Illthorn Rewrite - Project Rules & Guidelines

These rules are **MANDATORY** for all development sessions.

## 1. Golden Rule: "Warlock Parity"
*   **Requirement**: For every single feature or step, you must explicitly ask: *"How does Warlock (Kotlin/Compose) handle this?"*
*   **Goal**: Achieve feature parity with the Warlock client.
*   **Action**: Before implementation, briefly describe the Warlock equivalent to ensure we are matching its maturity and capabilities.

## 2. Granularity & Workflow ("The One-Step Rule")
*   **Requirement**: Never "do it all at once."
*   **Constraint**: Work on **exclusively ONE** granular step from `task.md` at a time.
*   **Forbidden**: Do not refactor unrelated code or "prepare" for future steps.

## 3. Release Protocol ("One Step = One Release")
*   **Trigger**: Completion of a single granular step.
*   **Action Sequence**:
    1.  **Verify**: Confirm the specific goal of the step is met.
    2.  **Commit**: `git add .` -> `git commit -m "feat: [Step Name] ..."`
    3.  **Version Bump**: `npm version major` (unless instructed otherwise).
    4.  **Stop**: Halt and ask user for permission to proceed to the next step.

## 4. State Persistence
*   **Source of Truth**: The active task list is located at `.agent/task.md`.
*   **Tracking**: This file must be updated immediately after every step completion.
*   **Location**: All agent artifacts (`task.md`, `implementation_plan.md`, `project_rules.md`) resolve to the `.agent/` directory in the project root.

## 5. Coding Standards
*   **Persistence**: Use `tauri-plugin-store` for client-side persistence (Warlock parity for SQLite).
*   **Tech Stack**: Tauri (Rust), Vue 3 (TypeScript).
