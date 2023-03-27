import * as path from "std/path/win32.ts";
import {
  get_image_dimensions,
  get_md5_hash
} from "./utils.ts";
import { Cache } from "./cache.ts";
import { ErrorHandler } from "./errors.ts";
import { Logger } from "./logger.ts";


export function setup_handle_file(
  { cache, config, files, logger, skipped, error_count, eh }: {
    cache: Cache;
    config: {
      start_time: Date;
      not_found_hash: string;
      wallpaper_folder: string;
      teardown: (message: string) => () => Promise<void>;
    };
    files: { name: string; reason: string; }[];
    logger: Logger;
    skipped: number;
    error_count: number;
    eh: ErrorHandler;
  }): (entry: Deno.DirEntry) => Promise<{ skipped: number; error_count: number; }> {
  return async (entry: Deno.DirEntry) => {
    try {
      const from_cache = await cache.get(entry.name);
      if(from_cache === null) {
        let to_be_deleted: false | string = false;
        const fullpath = path.resolve(config.wallpaper_folder, entry.name);
        const stats = await Deno.stat(fullpath);
        const content = await Deno.readFile(fullpath);
        const dimensions = get_image_dimensions(content);
        if(dimensions.width < 1920 || dimensions.height < 1080) {
          const reason = `too_small: [${dimensions.width}x${dimensions.height}]`;
          files.push({
            name: entry.name,
            reason,
          });
          to_be_deleted = reason;
        }
        // the file is somethink like 20kb, spare unnecessary calculations
        if(stats.size < 30000) {
          const hash = get_md5_hash(content.toString());

          if(hash === config.not_found_hash) {
            const reason = "not_found.jpg";
            files.push({ name: entry.name, reason });
            to_be_deleted = reason;
          }
        }
        cache.set({
          key: entry.name,
          value: to_be_deleted ? to_be_deleted : "",
        });
      } else {
        if(from_cache !== "") {
          files.push({ name: entry.name, reason: `${from_cache} [cache]` });
          logger.log(`found a file to delete from cache -> ${entry.name}`);
          logger.log(`                                  -> ${from_cache}`);
        }
        skipped++;
      }
    } catch(error) {
      error_count++;
      await eh.write_error_file({
        entry,
        error,
      });
    }
    return { skipped, error_count };
  };
}
