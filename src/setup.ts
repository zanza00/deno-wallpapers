import { get_md5_hash } from "./utils.ts";
import * as path from "std/path/win32.ts";

const not_found_image_path = path.resolve(".\\assets\\not_found.png");

export async function setup() {
  const not_found_file = (await Deno.readFile(not_found_image_path))
    .toString();
  const not_found_hash = get_md5_hash(not_found_file);
  console.log("not_found_hash", not_found_hash);
  return {
    not_found_hash,
    wallpaper_folder: "E:\\Dropbox\\IFTTT\\reddit\\wallpapers",
  };
}
