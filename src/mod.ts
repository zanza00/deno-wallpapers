import * as path from "std/path/win32.ts";
import { get_md5_hash } from "./utils.ts";
import { setup } from "./setup.ts";

export async function program(): Promise<void> {
  const config = await setup();
  const wlp = config.wallpaper_folder;
  const dirs = [];
  const files = [];
  let count = 0;
  for await (const entry of Deno.readDir(wlp)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      const fullpath = path.resolve(wlp, entry.name);
      const stats = await Deno.stat(fullpath);
      if (stats.size < 30_000) {
        const content = (await Deno.readFile(fullpath)).toString();
        const hash = get_md5_hash(content);
        if (hash === config.not_found_hash) {
          console.log("found a not_found.png", fullpath);
          files.push(entry.name);
        }
      }
    }
    count++;
    if (count % 100 === 0) {
      console.log(`${count} files processed`);
    }
  }

  console.log(`found ${dirs.length} dirs`);
  console.log(`found ${files.length} not_found_image`);

  for (const dir of dirs) {
    try {
      await Deno.remove(path.join(wlp, dir), { recursive: true });
    } catch (error) {
      console.error;
    }
  }
  for (const f of files) {
    try {
      await Deno.remove(path.join(wlp, f));
    } catch (error) {
      console.error;
    }
  }
}
