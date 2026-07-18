# Aether — Architecture

## Overview

Aether is an interactive CLI chat that helps developers understand and document codebases using AI. You run `aether`, it opens a conversational interface where you interact with commands and messages.

## Structure

```
src/
├── cli/
│   └── index.ts           Entry point
├── ui/
│   ├── animation.ts       Startup animation (typing effect, particles)
│   └── prompt.ts          Chat loop, dropdown autocomplete, tips
└── commands/
    ├── registry.ts        Command system (register, parse, execute)
    ├── help.ts            /help command
    └── builtins.ts        /genesis, /exit, /clear
```

## Flow

```
aether
  → registers commands
  → plays startup animation
  → starts chat loop (readline)
      → "/" triggers dropdown with ↑↓ navigation
      → Enter executes selected command
      → Regular text goes to respond()
```

## Tech

- Node.js 20+
- TypeScript (ES2022, NodeNext modules)
- chalk for colors
- readline native (no external prompt libs)
- No ANSI cursor hacks — works on Windows/macOS/Linux

## Theme

Primary color: `#895bf4` (purple)
