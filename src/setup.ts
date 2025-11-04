import { get_elapsed_time } from "./utils.ts";
import { initializeImageMagick } from "imagemagick";
import { Cache } from "./cache.ts";
import { Logger } from "./logger.ts";
import { ErrorHandler } from "./errors.ts";
import { get_config } from "./config.ts";

// const not_found_image_path = path.join("assets", "not_found.png");

export async function setup(raw_args: typeof Deno.args) {
  const config = get_config(raw_args);

  const start_time = new Date();
  // const not_found_file = (await Deno.readFile(not_found_image_path)).toString()
  const not_found_hash = config.imagesToRemove;

  const logger = new Logger(
    {
      date: start_time,
      file: config.writeLogFile,
      std_out: config.logs,
    },
    config,
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

  const handleSignal = async () => {
    logger.log("to exit immediately use CTRL+C again");
    await teardown(`gracefully exiting`, { prune: false })();
    setTimeout(() => {
      Deno.exit();
    }, 300);
  };

  Deno.addSignalListener("SIGINT", handleSignal);

  // Add SIGTERM support for Unix systems (Linux/macOS)
  if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", handleSignal);
  }

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
}
