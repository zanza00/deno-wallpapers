import { program } from "./src/mod.ts";

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
  for (const arg of Deno.args) {
    console.log(arg);
  }
  program().then((fn) => {
    fn();
  });
}
