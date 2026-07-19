import chalk from "chalk";
import { registry } from "./registry.js";
import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  validateConfig,
  detectProviderFromBaseUrl,
  type AetherConfig,
} from "../config/index.js";

import { ACCENT, DIM, SUCCESS } from "../ui/theme.js";

export function registerConfigCommand(): void {
  registry.register({
    name: "config",
    description: "Configure AI provider and model",
    usage: "/config [--provider <name>] [--model <model>] [--url <baseUrl>] [--key <apiKey>]",
    handler: async (args) => {
      const trimmedArgs = args.trim();

      // Help
      if (trimmedArgs === "--help" || trimmedArgs === "-h" || trimmedArgs === "help") {
        showConfigHelp();
        return;
      }

      // Show current config
      if (!trimmedArgs || trimmedArgs === "show") {
        await showCurrentConfig();
        return;
      }

      // Set config via flags
      if (trimmedArgs.startsWith("set")) {
        await setConfig(trimmedArgs.slice(3).trim());
        return;
      }

      // Quick provider setup: /config openai, /config anthropic, /config gemini, /config openrouter
      const validProviders = ["openai", "anthropic", "gemini", "openrouter"];
      if (validProviders.includes(trimmedArgs)) {
        await quickSetup(trimmedArgs as AetherConfig["provider"]);
        return;
      }

      process.stdout.write(`\n${chalk.red("  ✗")} Unknown option: ${trimmedArgs}\n`);
      process.stdout.write(`${DIM("     Use /config --help for usage info.\n\n")}`);
    },
  });
}

function showConfigHelp(): void {
  process.stdout.write(`\n${ACCENT("  ⚙ ")}${DIM("aether config")}\n\n`);
  process.stdout.write(`     Configure the AI provider for genesis.\n\n`);
  process.stdout.write(`     ${DIM("Usage:")}\n`);
  process.stdout.write(`       /config                     ${DIM("— show current config")}\n`);
  process.stdout.write(`       /config openai              ${DIM("— quick setup for OpenAI")}\n`);
  process.stdout.write(`       /config anthropic           ${DIM("— quick setup for Anthropic")}\n`);
  process.stdout.write(`       /config gemini              ${DIM("— quick setup for Gemini (free)")}\n`);
  process.stdout.write(`       /config set <key> <value>   ${DIM("— set a specific value")}\n\n`);
  process.stdout.write(`     ${DIM("Keys:")}\n`);
  process.stdout.write(`       provider    ${DIM("— openai, anthropic, gemini, openrouter")}\n`);
  process.stdout.write(`       model       ${DIM("— model name (e.g. gpt-4o, gemini-2.0-flash)")}\n`);
  process.stdout.write(`       url         ${DIM("— API base URL")}\n`);
  process.stdout.write(`       key         ${DIM("— API key")}\n\n`);
  process.stdout.write(`     ${DIM("Providers:")}\n`);
  process.stdout.write(`       ${chalk.white("gemini")}      ${DIM("model:")} gemini-2.0-flash\n`);
  process.stdout.write(`                   ${DIM("free tier: 15 RPM, 1M tokens/day")}\n`);
  process.stdout.write(`                   ${DIM("key:")} https://aistudio.google.com/apikeys\n\n`);
  process.stdout.write(`       ${chalk.white("openai")}      ${DIM("model:")} gpt-4o\n`);
  process.stdout.write(`                   ${DIM("paid — ~$0.01/10k tokens")}\n`);
  process.stdout.write(`                   ${DIM("key:")} https://platform.openai.com/api-keys\n\n`);
  process.stdout.write(`       ${chalk.white("anthropic")}   ${DIM("model:")} claude-sonnet-4-20250514\n`);
  process.stdout.write(`                   ${DIM("paid — ~$0.003/1k tokens")}\n`);
  process.stdout.write(`                   ${DIM("key:")} https://console.anthropic.com/\n\n`);
  process.stdout.write(`       ${chalk.white("openrouter")}  ${DIM("model:")} openrouter/auto ${DIM("(routes to many models — override with 'set model')")}\n`);
  process.stdout.write(`                   ${DIM("proxy for OpenAI/Gemini/free models, one key")}\n`);
  process.stdout.write(`                   ${DIM("key:")} https://openrouter.ai/keys\n\n`);
  process.stdout.write(`     ${DIM("Examples:")}\n`);
  process.stdout.write(`       /config gemini\n`);
  process.stdout.write(`       /config openrouter\n`);
  process.stdout.write(`       /config set model gpt-4o\n`);
  process.stdout.write(`       /config set key AIza...\n\n`);
}

async function showCurrentConfig(): Promise<void> {
  const config = await loadConfig(process.cwd());

  process.stdout.write(`\n${ACCENT("  ⚙ ")}${DIM("aether config")}\n\n`);

  if (!config) {
    process.stdout.write(`     ${chalk.yellow("No config found.")}\n`);
    process.stdout.write(`     ${DIM("Run /config gemini to get started.\n\n")}`);
    return;
  }

  process.stdout.write(`     ${DIM("Provider:")}  ${config.provider}\n`);
  process.stdout.write(`     ${DIM("Model:")}     ${config.model}\n`);
  process.stdout.write(`     ${DIM("Base URL:")}  ${config.baseUrl}\n`);
  process.stdout.write(`     ${DIM("API Key:")}   ${config.apiKey ? maskKey(config.apiKey) : DIM("(none)")}\n`);
  process.stdout.write("\n");
}

async function quickSetup(provider: AetherConfig["provider"]): Promise<void> {
  const defaults = getDefaultConfig(provider);
  const existing = await loadConfig(process.cwd());

  const config: AetherConfig = {
    provider,
    model: defaults.model!,
    baseUrl: defaults.baseUrl!,
    apiKey: existing?.apiKey,
    ...defaults,
  };

  await saveConfig(process.cwd(), config);

  process.stdout.write(`\n${SUCCESS("  ✓")} Config saved for ${ACCENT(provider)} ${DIM("(~/.aether/config.json)")}\n\n`);
  process.stdout.write(`     ${DIM("Provider:")}  ${config.provider}\n`);
  process.stdout.write(`     ${DIM("Model:")}     ${config.model}\n`);
  process.stdout.write(`     ${DIM("Base URL:")}  ${config.baseUrl}\n`);

  if (!config.apiKey) {
    process.stdout.write(`\n     ${chalk.yellow("⚠")} ${DIM("Don't forget to set your API key:")}\n`);
    process.stdout.write(`       /config set key <your-api-key>\n`);
  }

  process.stdout.write("\n");
}

async function setConfig(input: string): Promise<void> {
  const parts = input.split(/\s+/);
  const key = parts[0];
  const value = parts.slice(1).join(" ");

  if (!key || !value) {
    process.stdout.write(`\n${chalk.red("  ✗")} Usage: /config set <key> <value>\n\n`);
    return;
  }

  const keyMap: Record<string, keyof AetherConfig> = {
    provider: "provider",
    model: "model",
    url: "baseUrl",
    baseurl: "baseUrl",
    key: "apiKey",
    apikey: "apiKey",
  };

  const configKey = keyMap[key.toLowerCase()];
  if (!configKey) {
    process.stdout.write(`\n${chalk.red("  ✗")} Unknown key: ${key}\n`);
    process.stdout.write(`     ${DIM("Valid keys: provider, model, url, key\n\n")}`);
    return;
  }

  // Load existing or create default
  let config = await loadConfig(process.cwd());
  if (!config) {
    const defaults = getDefaultConfig("openai");
    config = {
      provider: "openai",
      model: defaults.model!,
      baseUrl: defaults.baseUrl!,
      ...defaults,
    } as AetherConfig;
  }

  // Apply change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (config as any)[configKey] = value;

  // Keep `provider` honest: if the base URL now points at a known host,
  // sync the label instead of letting it silently drift (e.g. "provider: gemini"
  // while baseUrl actually points at OpenRouter serving a different model).
  let providerNote = "";
  if (configKey === "baseUrl") {
    const detected = detectProviderFromBaseUrl(value);
    if (detected && detected !== config.provider) {
      config.provider = detected;
      providerNote = `\n     ${DIM(`↳ provider auto-detected as ${ACCENT(detected)} ${DIM("(base URL matched)")}`)}`;
    }
  }

  // Validate
  const errors = validateConfig(config);
  if (errors.length > 0) {
    process.stdout.write(`\n${chalk.yellow("  ⚠")} Warning:\n`);
    for (const err of errors) {
      process.stdout.write(`     ${DIM("•")} ${err}\n`);
    }
  }

  await saveConfig(process.cwd(), config);
  process.stdout.write(`\n${SUCCESS("  ✓")} ${configKey} set to ${configKey === "apiKey" ? maskKey(value) : value}${providerNote}\n\n`);
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}
