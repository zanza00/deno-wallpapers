import * as path from "std/path/mod.ts";
import type { Cache } from "./cache.ts";
import type { ErrorHandler } from "./errors.ts";
import type { Legacy_Logger } from "./logger.ts";
import { get_image_dimensions, get_md5_hash } from "./utils.ts";
import { Effect } from "effect";
import { CounterState } from "./CounterState.ts";

export function setup_handle_file({
	cache,
	data,
	files,
	logger,
	eh,
}: {
	cache: Cache;
	data: { targetFolder: string; not_found_hash: string[] };
	files: { name: string; reason: string }[];
	logger: Legacy_Logger;
	eh: ErrorHandler;
}) {
	return async (entry: Deno.DirEntry) => {
		return Effect.gen(function* () {
			const from_cache = yield* cache.get(entry.name);
			if (from_cache === null) {
				let to_be_deleted: false | string = false;
				const fullpath = path.resolve(data.targetFolder, entry.name);
				const stats = yield* Effect.tryPromise(() => Deno.stat(fullpath));
				const content = yield* Effect.tryPromise(() => Deno.readFile(fullpath));

				// the file is somethink like 20kb, spare unnecessary calculations
				if (stats.size < 30000) {
					const hash = get_md5_hash(content.toString());

					if (data.not_found_hash.includes(hash)) {
						const reason = "not_found.jpg";
						files.push({ name: entry.name, reason });
						to_be_deleted = reason;
					}
				} else {
					const dimensions = get_image_dimensions(content);
					if (dimensions.width < 1920 || dimensions.height < 1080) {
						const reason = `too_small: [${dimensions.width}x${dimensions.height}]`;
						files.push({
							name: entry.name,
							reason,
						});
						to_be_deleted = reason;
					}
				}
				yield* CounterState.inc("processed");
				cache.set({
					key: entry.name,
					value: to_be_deleted ? to_be_deleted : "",
				});
			} else {
				if (from_cache !== "") {
					files.push({ name: entry.name, reason: `${from_cache} [cache]` });
					logger.log(`found a file to delete from cache -> ${entry.name}`);
					logger.log(`                                  -> ${from_cache}`);
				}
				yield* CounterState.inc("skipped");
			}
		});

		// error_count++;
		// await eh.write_error_file({
		// 	entry,
		// 	error,
		// });
	};
}
