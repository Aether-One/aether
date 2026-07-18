import chalk from "chalk";

export interface Command {
  name: string;
  description: string;
  usage?: string;
  handler: (args: string) => Promise<void> | void;
}

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  async execute(input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return false;

    const spaceIndex = trimmed.indexOf(" ");
    const name = spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex);
    const args = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    const command = this.commands.get(name);
    if (!command) return false;

    await command.handler(args);
    return true;
  }
}

export const registry = new CommandRegistry();
