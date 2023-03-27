import { date_file_fmt } from "./utils.ts";

type LoggerConfig = {
  std_out: boolean;
  date: Date;
} & FileLoggerConfig;

type FileLoggerConfig = {
  file: false;
} | {
  file: true | string;
  flush_after?: number;
};

export class Logger {
  #std_out: boolean;
  #file: string | false;
  #messages: string[];
  #flush_after: number;
  #enabled: boolean;

  constructor(args: LoggerConfig) {
    this.#std_out = args.std_out;
    this.#file = args.file === true
      ? `log-${date_file_fmt(args.date)}.txt`
      : args.file;
    this.#messages = [];
    this.#flush_after = args.file === false ? -1 : args.flush_after ?? 10;
    this.#enabled = this.#file !== false || this.#std_out;
  }
  // deno-lint-ignore no-explicit-any
  log(...args: any[]) {
    if (!this.#enabled) return;

    this.#messages.push(args.join());

    if (this.#std_out) {
      console.log(...args);
    }
    if (this.#flush_after < this.#messages.length) {
      this.write();
    }
  }

  async write(): Promise<void> {
    if (this.#file !== false) {
      const msgs = this.#messages.splice(0, this.#messages.length);
      // ensure that a new line is always present so we preserve the log lines
      await Deno.writeTextFile(this.#file, msgs.concat("").join("\n"), {
        append: true,
      });
    }
  }

  /**
   * @param message one last message before finishing everything
   * @returns
   */
  async teardown(message?: string): Promise<void> {
    if (!this.#enabled) return;
    if (message !== undefined) {
      this.#messages.push(message);
      if (this.#std_out) {
        console.log(message);
      }
    }
    await this.write();
  }
}
