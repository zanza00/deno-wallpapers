import * as path from "std/path/win32.ts";
import { get_elapsed_time, get_image_dimensions, get_md5_hash, percentage } from "./utils.ts";
import { setup } from "./setup.ts";

export async function program(): Promise<() => Promise<void>> {
  const { cache, logger, errorHandler: eh, ...config } = await setup();

  const dirs: string[] = [];
  const files: { name: string; reason: string }[] = [];

  let error_count = 0;
  let count = 0;
  let skipped = 0;

  let first_of_which_skipped_message = true;

  const total_files = await get_numbers_of_files(config.wallpaper_folder);
  const chunk = Math.round(total_files / 99);
  const total_to_be_skipped = await cache.size();
  logger.log(
    `Let's parse some files, starting on:`,
    config.start_time.toISOString(),
  );
  logger.log(`Found ${total_files} files to handle`);
  if (cache.get_last_run() === "never") {
    logger.log(`No previous cache found...`);
  } else {
    logger.log(
      `of which present in cache ${total_to_be_skipped} (${
        percentage(total_to_be_skipped, total_files)
      })`,
    );
  }

  for await (const entry of Deno.readDir(config.wallpaper_folder)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      try {
        const from_cache = await cache.get(entry.name);
        if (from_cache === null) {
          let to_be_deleted: false | string = false;
          const fullpath = path.resolve(config.wallpaper_folder, entry.name);
          const stats = await Deno.stat(fullpath);
          const content = await Deno.readFile(fullpath);
          const dimensions = get_image_dimensions(content);
          if (dimensions.width < 1920 || dimensions.height < 1080) {
            const reason =
              `too_small: [${dimensions.width}x${dimensions.height}]`;
            files.push({
              name: entry.name,
              reason,
            });
            to_be_deleted = reason;
          }
          // the file is somethink like 20kb, spare unnecessary calculations
          if (stats.size < 30_000) {
            const hash = get_md5_hash(content.toString());

            if (hash === config.not_found_hash) {
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
    }
    count++;
    if (
      count > total_to_be_skipped &&
      skipped !== count &&
      count % chunk === 0
    ) {
      logger.log(
        `${percentage(count, total_files)} files processed`.concat(
          first_of_which_skipped_message
            ? ` [of which ${
              percentage(skipped, total_files)
            } were skipped due to be already present in the cache]`
            : ` {${get_elapsed_time(config.start_time, new Date())}}`,
        ),
      );
      if (first_of_which_skipped_message) {
        first_of_which_skipped_message = false;
      }
      if (dirs.length + files.length > 0) {
        logger.log(
          `found ${dirs.length} dirs and ${files.length} files to delete`,
        );
      }

      cache.save_progress();
    }
  }

  logger.log(
    `found ${dirs.length} (${percentage(dirs.length, total_files)}) dirs`,
  );
  logger.log(
    `found ${files.length} (${percentage(files.length, total_files)}) files`,
  );

  for (const dir of dirs) {
    try {
      logger.log(`[DIR] removing ${dir}`);
      await Deno.remove(path.join(config.wallpaper_folder, dir), {
        recursive: true,
      });
    } catch (error) {
      console.error(error);
    }
  }
  for (const f of files) {
    try {
      logger.log(`[files] removing ${f.name} because: ${f.reason}`);
      await Deno.remove(path.join(config.wallpaper_folder, f.name));
    } catch (error) {
      console.error(error);
    }
  }
  if (error_count > 0) {
    logger.log(`${error_count} found, see ${eh.get_error_filename()} file`);
  }

  return config.teardown(`finished on ${new Date().toISOString()}`);
}

// dumb but superfast method, under 100 ms
async function get_numbers_of_files(dir: string) {
  let count = 0;
  for await (const _entry of Deno.readDir(dir)) {
    count++;
  }
  return count;
}
