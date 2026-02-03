---
description: Granular Feature Release Workflow
---
# Granular Feature Release Workflow

This workflow enforces the "One Step = One Release" rule.

## 1. Task Selection
- Open `task.md`.
- Select the next unchecked granular item (e.g., "Step 1").
- **STOP**: Do not look at Step 2. Focus only on Step 1.

## 2. Implementation
- Write the minimal code necessary to complete *only* this step.
- Do not refactor unrelated code.
- Do not "prepare" for the next step.

## 3. Verification
- Verify the specific goal of the step (as defined in `task.md`).

## 4. Release & State Save
- Run `git add .`
- Run `git commit -m "feat: [Step Name]"`
- Run `npm version minor` (or `major` if requested).
- Update `task.md`: Mark item as `[x]`.

## 5. Stop Point
- Ask the user: "Step X Complete. Version bumped. Ready for Step X+1?"
