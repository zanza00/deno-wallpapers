import * as path from "std/path/mod.ts";
import { get_elapsed_time, percentage } from "./utils.ts";
import { setup } from "./setup.ts";
import { setup_handle_file } from "./handle_file.ts";
import { differenceInSeconds } from "date-fns";
import { Effect, Data } from "effect";
import { Cache } from "./cache.ts";
import { Config } from "./config.ts";
import { Legacy_Logger } from "./logger.ts";

export const program = (raw_args: typeof Deno.args) =>
  Effect.gen(function* (_) {
    const fromSetup = yield* _(setup(raw_args)); // ???

    const { cache, logger, errorHandler: eh, config, ...data } = fromSetup;
    const dirs: string[] = [];
    const files: { name: string; reason: string }[] = [];

    let error_count = 0;
    let count = 0;
    let processed = 0;
    let skipped = 0;

    let last_message_time = new Date();

    const total_files = yield* _(get_numbers_of_files(data.targetFolder));
    yield* _(Effect.log(`total number of files ${total_files}`));
    const chunk = Math.round(total_files / 200);
    const cache_size = yield* _(Effect.promise(() => cache.size()));
    yield* Effect.logInfo(
      `Let's parse some files, starting on: ${data.start_time.toISOString()}`
    );

    yield* Effect.logInfo(`Found ${total_files} files to handle`);
    if (cache.get_last_run() === "never") {
      yield* Effect.logInfo(`No previous cache found...`);
    } else {
      yield* Effect.logInfo(
        `cache updated on ${cache.get_last_run()} and contains ${cache_size} files (${percentage(
          cache_size,
          total_files
        )})`
      );
    }

    const handle_file = setup_handle_file({
      cache,
      data,
      files,
      logger,
      skipped,
      error_count,
      processed,
      eh,
    });

    ({ count, last_message_time } = yield* _(
      the_ciccia({
        data,
        config,
        dirs,
        skipped,
        error_count,
        processed,
        handle_file,
        count,
        chunk,
        last_message_time,
        logger,
        total_files,
        files,
        cache,
      })
    ));

    logger.log(`==========`);
    logger.log(`Processed ${processed} new files`);
    if (dirs.length + files.length > 0) {
      logger.log(
        `found ${dirs.length} (${percentage(dirs.length, total_files)}) dirs`
      );
      logger.log(
        `found ${files.length} (${percentage(files.length, total_files)}) files`
      );
    } else {
      logger.log(`Found noting to delete`);
    }
    const deleted_folders = yield* _(
      delete_files_or_folders(
        dirs.map((x) => ({ name: x, reason: "folder" })),
        logger,
        data.targetFolder,
        "folder"
      )
    );

    const deleted_files = yield* _(
      delete_files_or_folders(files, logger, data.targetFolder, "folder")
    );

    if (error_count > 0) {
      logger.log(
        `${error_count} errors found, see ${eh.get_error_filename()} file`
      );
    }

    data.teardown(`finished on ${new Date().toISOString()}`, {
      prune: true,
    });
  });

function delete_files_or_folders(
  targets: {
    name: string;
    reason: string;
  }[],
  logger: Legacy_Logger,
  targetFolder: string,
  kind: "folder" | "file"
) {
  return Effect.partition(targets, (t) =>
    Effect.tryPromise({
      try: async () => {
        try {
          if (kind === "folder") {
            await Deno.remove(path.join(targetFolder, t.name), {
              recursive: true,
            });
            logger.log(`[DIR] removing ${t.name}`);
          } else {
            await Deno.remove(path.join(targetFolder, t.name));
            logger.log(`[files] removing ${t.name} because: ${t.reason}`);
          }
          return t.name;
        } catch (error) {
          console.log("error", error);
        }
      },
      catch: (err) => new DenoError({ err, step: "delete empty dir" }),
    })
  );
}

function the_ciccia({
  cache,
  chunk,
  config,
  count,
  data,
  dirs,
  error_count,
  files,
  handle_file,
  last_message_time,
  logger,
  processed,
  skipped,
  total_files,
}: {
  data: {
    start_time: Date;
    not_found_hash: string[];
    targetFolder: string;
    teardown: (
      message: string,
      { prune }: { prune: boolean }
    ) => () => Promise<void>;
  };
  config: Config;
  dirs: string[];
  skipped: number;
  error_count: number;
  processed: number;
  handle_file: (
    entry: Deno.DirEntry
  ) => Promise<{ skipped: number; error_count: number; processed: number }>;
  count: number;
  chunk: number;
  last_message_time: Date;
  logger: Legacy_Logger;
  total_files: number;
  files: { name: string; reason: string }[];
  cache: Cache;
}) {
  return Effect.tryPromise({
    try: async () => {
      for await (const entry of Deno.readDir(data.targetFolder)) {
        if (entry.isDirectory && entry.name !== config.appFolderName) {
          dirs.push(entry.name);
        }
        if (entry.isFile) {
          ({ skipped, error_count, processed } = await handle_file(entry));
        }
        count++;

        if (
          count % chunk === 0 &&
          differenceInSeconds(new Date(), last_message_time) > 5
        ) {
          logger.log(
            `${percentage(
              count,
              total_files
            )} files processed [elapsed time: ${get_elapsed_time(
              data.start_time,
              new Date()
            )}]`
          );

          if (dirs.length + files.length > 0) {
            logger.log(
              `found ${dirs.length} dirs and ${files.length} files to delete`
            );
          }

          last_message_time = new Date();

          cache.save_progress({ prune: false });
        }
      }
      return { count, last_message_time };
    },
    catch: (err) => new DenoError({ err, step: "the_ciccia" }),
  });
}

// dumb but superfast method, under 100 ms
function get_numbers_of_files(dir: string): Effect.Effect<number, DenoError> {
  return Effect.tryPromise({
    try: async () => {
      let count = 0;
      for await (const _entry of Deno.readDir(dir)) {
        count++;
      }
      return count;
    },
    catch: (err) => new DenoError({ err, step: "count files" }),
  });
}

class DenoError extends Data.TaggedError("DenoError")<{
  err: unknown;
  step: string;
}> {}
