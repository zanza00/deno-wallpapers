import { Effect, Layer, Ref } from "effect";
import { program } from "./src/mod.ts";
import { CounterStateLive } from "./src/CounterState.ts";

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
	const runnable = program(Deno.args).pipe(Effect.provide(CounterStateLive));
	Effect.runFork(runnable);
}
