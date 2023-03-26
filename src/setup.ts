import { get_md5_hash } from "./utils.ts";
import * as path from "std/path/win32.ts";
import { initializeImageMagick } from "imagemagick";
import { Cache } from "./cache.ts";
import { Logger } from "./logger.ts";

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
  function teardown(message: string) {
    return async () => {
      await cache.teardown();
      await logger.log(message);
      await logger.teardown();
    };
  }

  Deno.addSignalListener("SIGINT", async () => {
    logger.log("interrupted, wait for proper exit");
    logger.log("to exit immediately use CTRL+C again");
    await teardown(`gracefully exiting on ${new Date().toISOString()}`)();
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
  };
}
