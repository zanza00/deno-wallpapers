import { Config } from "./config.ts";
import { date_file_fmt } from "./utils.ts";
import * as path from "std/path/mod.ts";

export class ErrorHandler {
  #error_filename: string;
  #start_time: Date;
  #enabled: boolean;
  #write_file: boolean;

  constructor({ start_time, config }: { start_time: Date; config: Config }) {
    this.#start_time = start_time;
    this.#error_filename = path.resolve(
      config.appFolder,
      `errors-${date_file_fmt(start_time)}.txt`
    );
    this.#enabled = config.errors;
    this.#write_file = config.writeErrorFile;
  }

  get_error_filename() {
    return this.#error_filename;
  }

  async write_error_file({
    entry,
    error,
  }: {
    entry: Deno.DirEntry;
    error: unknown;
  }) {
    if (this.#write_file) {
      let content = `${entry.name} on ${this.#start_time.toISOString()}`;
      if (error instanceof Error) {
        content = `${content} 
        ${error.name}
        ${error.message}
        ${error.stack}
        `;
      } else {
        content = `${content}
        ${String(error)}`;
      }
      await Deno.writeTextFile(this.#error_filename, content, {
        append: true,
      });
    }
  }
}
