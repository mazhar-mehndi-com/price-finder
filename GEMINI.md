# Gemini CLI Mandates

## Critical Rules
- **NO AUTOMATIC DEPLOYMENT**: Never execute `git push`, `git merge`, or any deployment-related commands without explicit, per-turn permission from the user.
- **CONFIRM BEFORE PUSH**: Even if a task seems complete, ask "Should I push these changes to live now?" and wait for a "Yes" before proceeding.
- **DIRECTORY PROTECTION**: If a directory deletion or move fails, stop and report it immediately rather than retrying automatically.
