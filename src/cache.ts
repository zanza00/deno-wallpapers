import * as path from "std/path/win32.ts";
import { Logger } from "./logger.ts";

const cache_file_path = path.resolve("./cache/cache_file.json");
const cache_dir_path = path.resolve("./cache");

type CacheData = {
  meta: {
    last_run: string;
    version: number;
  };
  files: Record<string, string | undefined>;
};
const empty_cache: CacheData = {
  meta: {
    last_run: "never",
    version: 1,
  },
  files: {},
};

export class Cache {
  #files: CacheData["files"];
  #meta: CacheData["meta"];
  #logger: Logger;
  constructor({ logger }: { logger: Logger }) {
    this.#files = empty_cache.files;
    this.#meta = empty_cache.meta;
    this.#logger = logger;
  }

  async init(): Promise<void> {
    try {
      const filecontent = await Deno.readTextFile(cache_file_path);
      const parsed = JSON.parse(filecontent);

      if (
        typeof parsed.meta === "object" && "last_run" in parsed.meta &&
        typeof parsed.files === "object"
      ) {
        this.#files = parsed.files;
        this.#meta = parsed.meta;
      }
    } catch (__error) {
      // emptyblock
    }
  }
  async teardown(): Promise<void> {
    this.#logger.log(`Writing cache file to disk`);
    await this.save_progress();
  }

  size(): Promise<number> {
    return new Promise<number>((resolve) => {
      resolve(Object.keys(this.#files).length);
    });
  }

  async save_progress(): Promise<void> {
    try {
      const cache_data: CacheData = {
        files: this.#files,
        meta: {
          last_run: new Date().toISOString(),
          version: 1,
        },
      };
      await Deno.mkdir(cache_dir_path, { recursive: true });
      await Deno.writeTextFile(cache_file_path, JSON.stringify(cache_data));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  get(n: string): Promise<string | null> {
    return new Promise((resolve) => {
      const found = this.#files[n];
      resolve(found ?? null);
    });
  }
  set({ key, value }: { key: string; value: string }): Promise<boolean> {
    return new Promise((resolve) => {
      this.#files[key] = value;
      resolve(true);
    });
  }

  get_last_run() {
    return this.#meta.last_run;
  }
}
