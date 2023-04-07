import * as path from "std/path/mod.ts";
import { get_image_dimensions, get_md5_hash } from "./utils.ts";
import { Cache } from "./cache.ts";
import { ErrorHandler } from "./errors.ts";
import { Logger } from "./logger.ts";

export function setup_handle_file({
  cache,
  data,
  files,
  logger,
  skipped,
  error_count,
  processed,
  eh,
}: {
  cache: Cache;
  data: { targetFolder: string; not_found_hash: string[] };
  files: { name: string; reason: string }[];
  logger: Logger;
  skipped: number;
  error_count: number;
  processed: number;
  eh: ErrorHandler;
}): (
  entry: Deno.DirEntry
) => Promise<{ skipped: number; error_count: number; processed: number }> {
  return async (entry: Deno.DirEntry) => {
    try {
      const from_cache = await cache.get(entry.name);
      if (from_cache === null) {
        let to_be_deleted: false | string = false;
        const fullpath = path.resolve(data.targetFolder, entry.name);
        const stats = await Deno.stat(fullpath);
        const content = await Deno.readFile(fullpath);

        // the file is somethink like 20kb, spare unnecessary calculations
        if (stats.size < 30000) {
          const hash = get_md5_hash(content.toString());

          if (data.not_found_hash.includes(hash)) {
            const reason = "not_found.jpg";
            files.push({ name: entry.name, reason });
            to_be_deleted = reason;
          }
        } else {
          const dimensions = get_image_dimensions(content);
          if (dimensions.width < 1920 || dimensions.height < 1080) {
            const reason = `too_small: [${dimensions.width}x${dimensions.height}]`;
            files.push({
              name: entry.name,
              reason,
            });
            to_be_deleted = reason;
          }
        }
        processed++;
        cache.set({
          key: entry.name,
          value: to_be_deleted ? to_be_deleted : "",
        });
      } else {
        if (from_cache !== "") {
          files.push({ name: entry.name, reason: `${from_cache} [cache]` });
          logger.log(`found a file to delete from cache -> ${entry.name}`);
          logger.log(`                                  -> ${from_cache}`);
        }
        skipped++;
      }
    } catch (error) {
      error_count++;
      await eh.write_error_file({
        entry,
        error,
      });
    }
    return { skipped, error_count, processed };
  };
}
