import chalk from "chalk";

const ACCENT = chalk.hex("#895bf4");
const DIM = chalk.dim;
const SUCCESS = chalk.green;
const FAIL = chalk.red;

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface Step {
  label: string;
  status: "pending" | "running" | "writing" | "done" | "error";
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

  setWriting(index: number): void {
    this.steps[index].status = "writing";
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

      process.stdout.write(`     ${icon} ${label}\n`);
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
