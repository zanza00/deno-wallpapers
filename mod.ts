import * as path from "https://deno.land/std@0.154.0/path/win32.ts";

const wlp = "E:\\Dropbox\\IFTTT\\reddit\\wallpapers";
/** JSDoc for this line */
export async function program() {
  const dirs = [];
  for await (const dirEntry of Deno.readDir(wlp)) {
    if (dirEntry.isDirectory) {
      dirs.push(dirEntry);
    }
  }

  console.log(`found ${dirs.length} dirs`);

  for (const dir of dirs) {
    try {
      
      await Deno.remove(path.join(wlp, dir.name), { recursive: true });
    } catch (error) {
      console.error
    }
  }
}
