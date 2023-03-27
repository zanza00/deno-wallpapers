import { get_md5_hash } from "./utils.ts";
import * as path from "std/path/win32.ts";
import { initializeImageMagick } from "imagemagick";
import { Cache } from "./cache.ts";
import { Logger } from "./logger.ts";
import { ErrorHandler } from "./errors.ts";
import { formatDuration, getMilliseconds, intervalToDuration } from "date-fns";

const not_found_image_path = path.resolve(".\\assets\\not_found.png");

export async function setup() {
  await initializeImageMagick();

  const start_time = new Date();
  const not_found_file = (await Deno.readFile(not_found_image_path))
    .toString();
  const not_found_hash = get_md5_hash(not_found_file);

  const logger = new Logger({
    date: start_time,
    file: true,
    std_out: true,
  });
  const cache = new Cache({ logger });
  const errorHandler = new ErrorHandler({ start_time });

  function teardown(message: string) {
    return async () => {
      const end = new Date();
      const duration = intervalToDuration({
        start: start_time,
        end,
      });

      logger.log(
        `finished on ${end.toISOString()}
time elapsed: ${duration.seconds === 0 ? "" : formatDuration(duration)}`.concat(
          ` ${getMilliseconds(end - start_time)} milliseconds`,
        ),
      );
      await cache.teardown();
      await logger.teardown(message);
    };
  }

  Deno.addSignalListener("SIGINT", async () => {
    logger.log("to exit immediately use CTRL+C again");
    await teardown(`gracefully exiting`)();
    Deno.exit();
  });

  await cache.init();
  return {
    logger,
    start_time,
    not_found_hash,
    wallpaper_folder: "E:\\Dropbox\\IFTTT\\reddit\\wallpapers",
    cache,
    teardown,
    errorHandler,
  };
}
