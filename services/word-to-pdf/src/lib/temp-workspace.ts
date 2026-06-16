import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Logger } from "../logger.js";

export class TempWorkspace {
  readonly id = randomUUID();
  readonly root: string;
  readonly inputDir: string;
  readonly outputDir: string;
  readonly profileDir: string;

  private cleaned = false;

  constructor(tempRoot: string) {
    this.root = path.join(tempRoot, `job-${this.id}`);
    this.inputDir = path.join(this.root, "input");
    this.outputDir = path.join(this.root, "output");
    this.profileDir = path.join(this.root, "lo-profile");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.inputDir, { recursive: true });
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.profileDir, { recursive: true });
  }

  inputPath(filename: string): string {
    return path.join(this.inputDir, filename);
  }

  async cleanup(log: Logger): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;
    try {
      await fs.rm(this.root, { recursive: true, force: true });
      log.debug({ workspaceId: this.id }, "temp workspace cleaned");
    } catch (error) {
      log.warn({ workspaceId: this.id, error }, "failed to clean temp workspace");
    }
  }
}
