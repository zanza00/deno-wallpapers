import { get_elapsed_time, get_md5_hash } from "./utils.ts";
import * as path from "std/path/mod.ts";
import { initializeImageMagick } from "imagemagick";
import { Cache } from "./cache.ts";
import { Legacy_Logger } from "./logger.ts";
import { ErrorHandler } from "./errors.ts";
import { get_config } from "./config.ts";
import { Data, Effect } from "effect";

// const not_found_image_path = path.resolve(".\\assets\\not_found.png");

export function setup(raw_args: typeof Deno.args) {
  return Effect.tryPromise({
    try: async () => {
      const config = get_config(raw_args);

      const start_time = new Date();
      // const not_found_file = (await Deno.readFile(not_found_image_path)).toString()
      const not_found_hash = config.imagesToRemove;

      const logger = new Legacy_Logger(
        {
          date: start_time,
          file: config.writeLogFile,
          std_out: config.logs,
        },
        config
      );
      const cache = new Cache({ logger, config });
      const errorHandler = new ErrorHandler({ start_time, config });

      function teardown(message: string, { prune }: { prune: boolean }) {
        return async () => {
          const end = new Date();
          const elapsed = get_elapsed_time(start_time, end);

          logger.log(`time elapsed: ${elapsed}`);
          await cache.teardown({ prune });
          await logger.teardown(message);
        };
      }

      Deno.addSignalListener("SIGINT", async () => {
        logger.log("to exit immediately use CTRL+C again");
        await teardown(`gracefully exiting`, { prune: false })();
        setTimeout(() => {
          Deno.exit();
        }, 300);
      });

      await cache.init();
      await initializeImageMagick();

      return {
        logger,
        start_time,
        not_found_hash,
        targetFolder: config.target,
        cache,
        teardown,
        errorHandler,
        config,
      };
    },
    catch: (err) => new SetupError({ err, message: "error while setupping" }),
  });
}

class SetupError extends Data.TaggedError("SetupError")<{
  err: unknown;
  message: string;
}> {}
