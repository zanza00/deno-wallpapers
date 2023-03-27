import { date_file_fmt } from "./utils.ts";

export class ErrorHandler {
  #error_filename: string;
  #start_time: Date;

  constructor(c: { start_time: Date }) {
    this.#start_time = c.start_time;
    this.#error_filename = `errors-${date_file_fmt(c.start_time)}.txt`;
  }

  get_error_filename() {
    return this.#error_filename;
  }

  async write_error_file(
    { entry, error }: {
      entry: Deno.DirEntry;
      error: unknown;
    },
  ) {
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
