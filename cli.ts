import { program } from "./src/mod.ts";

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
  program(Deno.args).then((fn) => {
    fn();
  });
}
