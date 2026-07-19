import chalk from "chalk";

import { ACCENT, DIM, SUCCESS } from "./theme.js";
const FAIL = chalk.red;

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface Step {
  label: string;
  status: "pending" | "running" | "writing" | "done" | "error";
  /** Transient sub-status shown while running (e.g. "distilling 2/4"). */
  detail?: string;
}

export class StepRunner {
  private steps: Step[] = [];
  private currentIndex = -1;
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private spinnerFrame = 0;
  private linesWritten = 0;

  constructor(private title: string) {}

  addStep(label: string): void {
    this.steps.push({ label, status: "pending" });
  }

  start(): void {
    process.stdout.write(`\n${ACCENT("  ⚡ ")}${DIM(this.title)}\n\n`);
    this.linesWritten = 0;
    this.render();
  }

  async runStep(index: number, fn: () => Promise<void>): Promise<void> {
    this.currentIndex = index;
    this.steps[index].status = "running";
    this.startSpinner();

    try {
      await fn();
      this.stopSpinner();
      this.steps[index].status = "done";
      this.render();
    } catch (err) {
      this.stopSpinner();
      this.steps[index].status = "error";
      this.render();
      throw err;
    }
  }

  /**
   * Runs `fn` for every step with at most `limit` in flight at once. Steps light
   * up concurrently (each with its own spinner) and settle as they finish — much
   * faster than one-at-a-time when each step is a slow model call. The first
   * failure aborts and rethrows.
   */
  async runPooled(limit: number, fn: (index: number) => Promise<void>): Promise<void> {
    this.startSpinner();
    let next = 0;

    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= this.steps.length) break;
        this.steps[i].status = "running";
        this.render();
        try {
          await fn(i);
          this.steps[i].status = "done";
          this.render();
        } catch (err) {
          this.steps[i].status = "error";
          this.render();
          throw err;
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(limit, this.steps.length) }, worker));
    } finally {
      this.stopSpinner();
      this.render();
    }
  }

  setWriting(index: number): void {
    this.steps[index].status = "writing";
    this.steps[index].detail = undefined;
    this.render();
  }

  /** Update the transient sub-status of the running step (cleared when it finishes). */
  setDetail(index: number, detail: string | undefined): void {
    this.steps[index].detail = detail;
    this.render();
  }

  finish(summary?: string): void {
    this.stopSpinner();
    process.stdout.write("\n");
    if (summary) {
      process.stdout.write(`${SUCCESS("  ✓")} ${summary}\n`);
    }
    process.stdout.write("\n");
  }

  error(message: string): void {
    this.stopSpinner();
    process.stdout.write("\n");
    process.stdout.write(`${FAIL("  ✗")} ${message}\n\n`);
  }

  private startSpinner(): void {
    this.spinnerInterval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
      this.render();
    }, 80);
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  private render(): void {
    // Clear previous lines
    if (this.linesWritten > 0) {
      process.stdout.write(`\x1B[${this.linesWritten}A`);
      process.stdout.write("\x1B[0J");
    }

    let lines = 0;
    for (const step of this.steps) {
      const icon = this.getIcon(step.status);
      const label = step.status === "done"
        ? DIM(step.label)
        : step.status === "error"
          ? FAIL(step.label)
          : step.label;

      const detail = step.status === "running" && step.detail ? ` ${DIM(`— ${step.detail}`)}` : "";
      process.stdout.write(`     ${icon} ${label}${detail}\n`);
      lines++;
    }

    this.linesWritten = lines;
  }

  private getIcon(status: Step["status"]): string {
    switch (status) {
      case "pending":
        return DIM("○");
      case "running":
        return ACCENT(SPINNER_FRAMES[this.spinnerFrame]);
      case "writing":
        return chalk.yellow("✎");
      case "done":
        return SUCCESS("✓");
      case "error":
        return FAIL("✗");
    }
  }
}

export class LineSpinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private startTime = 0;

  constructor(private label: string) {}

  start(): void {
    this.startTime = Date.now();
    this.render();
    this.interval = setInterval(() => {
      this.frame = (this.frame + 1) % SPINNER_FRAMES.length;
      this.render();
    }, 80);
  }

  /** Update the label shown next to the spinner (e.g. progress counters). */
  setLabel(label: string): void {
    this.label = label;
    this.render();
  }

  /** Print a standalone line above the spinner, then keep animating below it. */
  log(line: string): void {
    this.clearLine();
    process.stdout.write(`${line}\n`);
    this.render();
  }

  succeed(suffix?: string): void {
    this.stop();
    this.clearLine();
    process.stdout.write(`     ${DIM(this.label)} ${SUCCESS("✓")}${suffix ? ` ${DIM(suffix)}` : ""}\n`);
  }

  fail(suffix?: string): void {
    this.stop();
    this.clearLine();
    process.stdout.write(`     ${FAIL(this.label)} ${FAIL("✗")}${suffix ? ` ${DIM(suffix)}` : ""}\n`);
  }

  private render(): void {
    this.clearLine();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    process.stdout.write(
      `     ${ACCENT(SPINNER_FRAMES[this.frame])} ${DIM(this.label)} ${DIM(`(${elapsed}s)`)}`,
    );
  }

  private clearLine(): void {
    process.stdout.write("\r\x1B[2K");
  }

  private stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
