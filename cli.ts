import { Effect } from "effect";
import { program } from "./src/mod.ts";

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
  Effect.runPromise(program(Deno.args)).then(console.log, console.error);
}
