import * as path from "std/path/win32.ts";
import {
  date_file_fmt,
  get_image_dimensions,
  get_md5_hash,
  percentage,
} from "./utils.ts";
import { setup } from "./setup.ts";

export async function program(): Promise<() => Promise<void>> {
  const { cache, logger, ...config } = await setup();

  const dirs: string[] = [];
  let error_count = 0;
  const files: { name: string; reason: string }[] = [];
  const error_filename = `errors-${date_file_fmt(config.start_time)}.txt`;
  let count = 0;
  let skipped = 0;
  const total_files = await get_numbers_of_files(config.wallpaper_folder);
  const chunk = Math.round(total_files / 100);
  const to_be_skipped = await cache.size();
  logger.log(`Let's parse some files`, config.start_time.toISOString());
  logger.log(`Found ${total_files} files to handle`);
  logger.log(
    `of which present in cache ${to_be_skipped} (${
      percentage(to_be_skipped, total_files)
    })`,
  );

  for await (const entry of Deno.readDir(config.wallpaper_folder)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      try {
        const fromCache = await cache.get(entry.name);
        if (fromCache === null) {
          const fullpath = path.resolve(config.wallpaper_folder, entry.name);
          const stats = await Deno.stat(fullpath);
          const content = await Deno.readFile(fullpath);
          const dimensions = get_image_dimensions(content);
          if (dimensions.width < 1920 || dimensions.height < 1080) {
            files.push({
              name: entry.name,
              reason: `too_small: [${dimensions.width}x${dimensions.height}]`,
            });
          }
          // the file is somethink like 20kb, spare unnecessary calculations
          if (stats.size < 30_000) {
            const hash = get_md5_hash(content.toString());
            if (hash === config.not_found_hash) {
              logger.log("found a not_found.png", fullpath);
              files.push({ name: entry.name, reason: "not_found.jpg" });
            }
          }
          cache.set({ key: entry.name, value: "" });
        } else {
          skipped++;
        }
      } catch (error) {
        error_count++;
        await write_error_file({
          entry,
          error,
          error_filename,
          date: config.start_time,
        });
      }
    }
    count++;
    if (
      count > to_be_skipped &&
      skipped !== count &&
      count % chunk === 0
    ) {
      const to_log = `${count}/${total_files} (${
        percentage(count, total_files)
      }) files processed [of which ${skipped} were skipped]
found ${dirs.length} dirs
      ${files.length} files to delete
`;
      logger.log(to_log);

      await cache.save_progress();
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
    logger.log(`${error_count} found, see ${error_filename} file`);
  }

  return config.teardown(`finished on ${new Date().toISOString()}`);
}

async function write_error_file(
  { entry, error, error_filename, date }: {
    entry: Deno.DirEntry;
    error: unknown;
    error_filename: string;
    date: Date;
  },
) {
  let content = `${entry.name} on ${date.toISOString()}`;
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
  await Deno.writeTextFile(error_filename, content, {
    append: true,
  });
}

async function get_numbers_of_files(dir: string) {
  let count = 0;
  for await (const _entry of Deno.readDir(dir)) {
    count++;
  }
  return count;
}
