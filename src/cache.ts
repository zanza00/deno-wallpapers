import { Logger } from "./logger.ts";
import { z } from "zod";
import { Config } from "./config.ts";

const cacheDataSchema = z.object({
  meta: z.object({
    last_run: z.string().datetime(),
    last_exit: z.string(),
    version: z.literal(1),
  }),
  files: z.record(z.string()),
});

type codec = z.infer<typeof cacheDataSchema>;

type CacheData = {
  meta: codec["meta"];
  files: Record<string, string | undefined>;
};
const empty_cache: CacheData = {
  meta: {
    last_run: "new_cache",
    last_exit: "new_cache",
    version: 1,
  },
  files: {},
};

export class Cache {
  #files: CacheData["files"];
  #meta: CacheData["meta"];
  #logger: Logger;
  #config: Config;

  constructor({ logger, config }: { logger: Logger; config: Config }) {
    this.#files = empty_cache.files;
    this.#meta = empty_cache.meta;
    this.#logger = logger;
    this.#config = config;
  }

  async init(): Promise<void> {
    try {
      if (this.#config.cache !== false) {
        const filecontent = await Deno.readTextFile(this.#config.cache);
        const parsed = JSON.parse(filecontent);
        const zodded = cacheDataSchema.parse(parsed);

        this.#files = zodded.files;
        this.#meta = zodded.meta;
      }
    } catch (__error) {
      // emptyblock
    }
  }
  async teardown({ prune }: { prune: boolean }): Promise<void> {
    if (this.#config.cache !== false) {
      await this.save_progress({ prune });
    }
  }

  size(): Promise<number> {
    return new Promise<number>((resolve) => {
      resolve(Object.keys(this.#files).length);
    });
  }

  #get_files({ prune = false }: { prune: boolean }) {
    if (prune) {
      const files: Record<string, string> = {};
      for (const key in this.#files) {
        if (Object.prototype.hasOwnProperty.call(this.#files, key)) {
          const element = this.#files[key];
          if (element === "") {
            files[key] = element;
          }
        }
      }
      return files;
    }
    return this.#files;
  }

  async save_progress({ prune = false }: { prune: boolean }): Promise<void> {
    if (this.#config.cache !== false) {
      try {
        const files = this.#get_files({ prune });
        const cache_data: CacheData = {
          files: files,
          meta: {
            last_run: new Date().toISOString(),
            last_exit: prune ? "clean" : "interrupted",
            version: 1,
          },
        };
        await Deno.mkdir(this.#config.appFolder, { recursive: true });
        await Deno.writeTextFile(
          this.#config.cache,
          JSON.stringify(cache_data)
        );
      } catch (error) {
        return Promise.reject(error);
      }
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
