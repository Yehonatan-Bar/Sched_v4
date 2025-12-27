# Project Instructions

## Language

**Always respond in English**, even if the user writes in Hebrew or any other language.

---

## Project Snapshot Maintenance

**File**: `SNAPSHOT.md` (root directory)

### Rules

1. **Update at end of each development session** - Before finishing work, update the snapshot
2. **Current state only** - No history, no changelog, just what exists NOW
3. **Keep it short** - Brief descriptions, bullet points, no verbose explanations

### Snapshot Structure

```markdown
# Project Snapshot

## Architecture
- Tech stack
- Key patterns used

## Modules/Components
- List main modules with one-line purpose

## Data Flow
- How data moves through the system

## External Dependencies
- APIs, services, databases

## Configuration
- Key config files and their purpose

## Entry Points
- Main files to start the app

## Current Status
- What works
- What's in progress
- Known issues
```

### Guidelines

- Delete outdated info, don't accumulate
- If a feature is removed, remove it from snapshot
- Reflect reality, not plans
- **Actively review for conciseness** - When updating, check the entire file and rephrase or consolidate content as needed to keep it tight
