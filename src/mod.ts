import * as path from "std/path/win32.ts";
import { get_image_dimensions, get_md5_hash } from "./utils.ts";
import { setup } from "./setup.ts";

export async function program(): Promise<void> {
  const config = await setup();
  const wlp = config.wallpaper_folder;
  const dirs: string[] = [];
  const errors = [];
  const files: { name: string; reason: string }[] = [];
  let count = 0;
  for await (const entry of Deno.readDir(wlp)) {
    if (entry.isDirectory) {
      dirs.push(entry.name);
    }
    if (entry.isFile) {
      try {
        const fullpath = path.resolve(wlp, entry.name);
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
            console.log("found a not_found.png", fullpath);
            files.push({ name: entry.name, reason: "not_found.jpg" });
          }
        }
      } catch (error) {
        console.error(error);
        errors.push(error);
      }
    }
    count++;
    if (count % 100 === 0) {
      console.log(`${count} files processed`);
      console.log(`found ${dirs.length} dirs`);
      console.log(`      ${files.length} files to delete`);
    }
  }

  console.log(`found ${dirs.length} dirs`);
  console.log(`found ${files.length} not_found_image`);

  for (const dir of dirs) {
    try {
      console.log(`[DIR] removing ${dir}`);
      await Deno.remove(path.join(wlp, dir), { recursive: true });
    } catch (error) {
      console.error(error);
    }
  }
  for (const f of files) {
    try {
      console.log(`[files] removing ${f.name} because: ${f.reason}`);
      await Deno.remove(path.join(wlp, f.name));
    } catch (error) {
      console.error(error);
    }
  }
  errors.forEach((e) => {
    console.log(e);
  });
}
