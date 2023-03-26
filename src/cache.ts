import * as path from "std/path/win32.ts";

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
  private files: CacheData["files"];
  meta: CacheData["meta"];
  constructor() {
    this.files = empty_cache.files;
    this.meta = empty_cache.meta;
  }

  init = async () => {
    try {
      const filecontent = await Deno.readTextFile(cache_file_path);
      const parsed = JSON.parse(filecontent);

      if (
        typeof parsed.meta === "object" && "last_run" in parsed.meta &&
        typeof parsed.files === "object"
      ) {
        this.files = parsed.files;
        this.meta = parsed.meta;
        console.log(`Cache found, last run on: ${this.meta.last_run}`);
      }
    } catch (__error) {
      // emptyblock
    }
  };
  teardown = async () => {
    await this.save_progress();
  };

  save_progress = async () => {
    try {
      const cache_data: CacheData = {
        files: this.files,
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
  };

  get = (n: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const found = this.files[n];
      resolve(found ?? null);
    });
  };
  set = ({ key, value }: { key: string; value: string }): Promise<boolean> => {
    return new Promise((resolve) => {
      this.files[key] = value;
      resolve(true);
    });
  };
}
