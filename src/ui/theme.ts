import chalk from "chalk";

/** Terminal theme — the single source of truth for Aether's colors. */
export const ACCENT_HEX = "#895bf4";

export const ACCENT = chalk.hex(ACCENT_HEX);
export const ACCENT_BOLD = chalk.bold.hex(ACCENT_HEX);
export const DIM = chalk.dim;
export const SUCCESS = chalk.green;
export const WARN = chalk.yellow;
export const ERROR = chalk.red;
