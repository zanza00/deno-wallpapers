import { Effect } from "effect";
import { program } from "./src/mod.ts";
import { get_config } from "./src/config.ts";
import * as path from "std/path/mod.ts";

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
  Effect.runPromise(program(Deno.args)).then((x) => {
    if (x !== undefined) {
      console.log("after execution", x);
    }
  }, console.error);

  // const config = get_config(Deno.args);

  // const data ={
  //   targetFolder:config.target
  // }
  // const dirs = [
  //   "Aesthetic anime girl with purple hair looking at pastel lilac",
  //   "Debian GNU",
  //   "Looking for matching",
  //   "Softly drawn pink",
  //   "Wallhaven.cc",
  // ];

  // for (const dir of dirs) {
     
  //   try {
  //     console.log(`[HACK] removing ${path.join(data.targetFolder, dir)}`);
  //     await Deno.remove(path.join(data.targetFolder, dir), {
  //       recursive: true,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
}
