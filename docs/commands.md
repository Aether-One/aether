# Aether — Commands

## Available Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/genesis` | Analyze and document your project (coming soon) |
| `/exit` | Exit Aether |
| `/clear` | Clear the screen |

## Dropdown Navigation

When you type `/`, a dropdown appears with all matching commands. Navigate with ↑↓ arrows and press Enter to select.

## Adding a New Command

```ts
import { registry } from "./registry.js";

registry.register({
  name: "mycommand",
  description: "What it does",
  handler: (args) => {
    // your logic
  },
});
```

Register it in `src/cli/index.ts`.
