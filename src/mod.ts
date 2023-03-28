import * as path from "std/path/mod.ts";
import { get_elapsed_time, percentage } from "./utils.ts";
import { setup } from "./setup.ts";
import { setup_handle_file } from "./handle_file.ts";
import { differenceInSeconds } from "date-fns";

export async function program(): Promise<() => Promise<void>> {
  const { cache, logger, errorHandler: eh, ...config } = await setup();

  const dirs: string[] = [];
  const files: { name: string; reason: string }[] = [];

  let error_count = 0;
  let count = 0;
  let processed = 0;
  let skipped = 0;

  let last_message_time = new Date();

  const total_files = await get_numbers_of_files(config.wallpaper_folder);
  const chunk = Math.round(total_files / 99);
  const cache_size = await cache.size();
  logger.log(
    `Let's parse some files, starting on:`,
    config.start_time.toISOString(),
  );
  logger.log(`Found ${total_files} files to handle`);
  if (cache.get_last_run() === "never") {
    logger.log(`No previous cache found...`);
  } else {
    logger.log(
      `cache contains ${cache_size} files (${
        percentage(cache_size, total_files)
      })`,
    );
  }

  const handle_file = setup_handle_file({
    cache,
    config,
    files,
    logger,
    skipped,
    error_count,
    processed,
    eh,
  });

  for await (const entry of Deno.readDir(config.wallpaper_folder)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      ({ skipped, error_count, processed } = await handle_file(
        entry,
      ));
    }
    count++;

    if (
      count % chunk === 0 &&
      differenceInSeconds(new Date(), last_message_time) > 5
    ) {
      logger.log(
        `${percentage(count, total_files)} files processed [elapsed time: ${
          get_elapsed_time(config.start_time, new Date())
        }]`,
      );

      if (dirs.length + files.length > 0) {
        logger.log(
          `found ${dirs.length} dirs and ${files.length} files to delete`,
        );
      }

      last_message_time = new Date();

      cache.save_progress({ prune: false });
    }
  }
  logger.log(`==========`)
  logger.log(`Processed ${processed} new files`);
  if (dirs.length + files.length > 0) {
    logger.log(
      `found ${dirs.length} (${percentage(dirs.length, total_files)}) dirs`,
    );
    logger.log(
      `found ${files.length} (${percentage(files.length, total_files)}) files`,
    );
  } else {
    logger.log(`Found noting to delete`);
  }


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
    logger.log(
      `${error_count} errors found, see ${eh.get_error_filename()} file`,
    );
  }

  return config.teardown(`finished on ${new Date().toISOString()}`, {
    prune: true,
  });
}

// dumb but superfast method, under 100 ms
async function get_numbers_of_files(dir: string) {
  let count = 0;
  for await (const _entry of Deno.readDir(dir)) {
    count++;
  }
  return count;
}
