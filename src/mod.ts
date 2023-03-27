import * as path from "std/path/win32.ts";
import { get_elapsed_time, percentage } from "./utils.ts";
import { setup } from "./setup.ts";
import { setup_handle_file } from "./handle_file.ts";

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

  const handle_file = setup_handle_file({
    cache,
    config,
    files,
    logger,
    skipped,
    error_count,
    eh,
  });

  for await (const entry of Deno.readDir(config.wallpaper_folder)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      ({ skipped, error_count } = await handle_file(
        entry,
      ));
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
