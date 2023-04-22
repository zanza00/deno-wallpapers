import * as path from "std/path/mod.ts";
import { z } from "zod";
import { parse } from "std/flags/mod.ts";
import { match, P } from "ts-pattern";

const APP_NAME = `pixel_mage`;

const boolean_or_path = z.union([z.string(), z.boolean()]).optional();

export const AppArgs = z.object({
  _: z
    .array(z.string())
    .min(1)
    .catch([Deno.cwd()])
    .describe("I can only handle one directory right now"),
  config: z.string().optional(),
  "app-folder": z.string().optional(),
  cache: boolean_or_path,
  log: z.boolean().optional().default(true),
  "file-log": z.boolean().optional().default(true),
  error: z.boolean().optional().default(true),
  "file-errors": z.boolean().optional().default(true),
  quiet: z.boolean().optional().default(false),
  "images-to-remove": z
    .array(z.string())
    .optional()
    .default(["2d49be9a3b8ee992a77a4bf306cf076a"]),
  "min-width": z.number().optional().default(1920),
  "min-height": z.number().optional().default(1080),
  "over-max-action": z
    .union([z.literal("resize"), z.literal("delete"), z.literal("none")])
    .optional()
    .default("none"),
  "max-width": z.number().optional().default(5000),
  "max-height": z.number().optional().default(5000),
});
type AppArgs = z.infer<typeof AppArgs>;

export function get_config(raw_args: typeof Deno.args) {
  const args = parse(raw_args, {
    alias: {
      config: "C",
      "app-folder": ["folder", "f"],
      cache: "c",
      log: "l",
      error: "e",
      quiet: "q",
      "over-max-action": "oma",
    },
    negatable: ["log", "error", "cache"],
  });
  const parsed_args = AppArgs.safeParse(args);
  if (parsed_args.success) {
    const merged = mergeWithDefaults(parsed_args.data);

    return merged;
  } else {
    console.warn(parsed_args.error);
    return mergeWithDefaults(AppArgs.parse({}));
  }
}

function mergeWithDefaults(a: AppArgs): Config {
  const target = a._[0];
  const extraTargets = a._.slice(1);
  const appFolderName = a["app-folder"] ?? `.${APP_NAME}`;

  const cache = getCache(a, target, appFolderName);
  const logs = getLogs(a);
  const errors = getErrors(a);

  return {
    target,
    extraTargets,
    appFolder: path.resolve(target, appFolderName),
    appFolderName,
    cache,
    ...logs,
    ...errors,
    imagesToRemove: a["images-to-remove"],
    maxHeight: a["max-height"],
    maxWidth: a["max-width"],
    minHeight: a["min-height"],
    minWidth: a["min-width"],
    overMaxAction: a["over-max-action"],
  };
}

type LogConfig = {
  logs: boolean;
  writeLogFile: boolean;
};

type ErrorConfig = {
  errors: boolean;
  writeErrorFile: boolean;
};

export type Config = {
  target: string; //_
  extraTargets: string[];

  appFolder: string; // default target/cli_name
  appFolderName: string;

  cache: false | string; // deault cli_folder/cache.json

  imagesToRemove: hash[];

  minWidth: number;
  minHeight: number;

  overMaxAction: "none" | "resize" | "delete";

  maxWidth: number;
  maxHeight: number;
} & LogConfig &
  ErrorConfig;

type hash = string;

function getCache(
  { cache }: AppArgs,
  targetFolder: string,
  appFolderName: string
): string | false {
  return match(cache)
    .with(false, () => false as false)
    .with(P.string, (c) => path.resolve(c))
    .otherwise(() => path.resolve(targetFolder, appFolderName, `.cache.json`));
}

function getLogs({ log, "file-log": file, quiet }: AppArgs): LogConfig {
  return match({ log, file, quiet })
    .with({ quiet: true }, () => ({
      logs: true,
      writeLogFile: false,
    }))
    .with({ log: false, file: P.any }, () => ({
      logs: true,
      writeLogFile: false,
    }))
    .with(
      {
        log: true,
        file: P.select("file"),
      },
      (data) => ({
        logs: true,
        writeLogFile: data.file,
      })
    )
    .exhaustive();
}

function getErrors({
  quiet,
  error,
  "file-errors": file,
}: AppArgs): ErrorConfig {
  return match({ error, file, quiet })
    .with({ quiet: true }, () => ({
      errors: false,
      writeErrorFile: false,
    }))
    .with({ error: false, file: P.any }, () => ({
      errors: false,
      writeErrorFile: false,
    }))
    .with(
      {
        error: true,
        file: P.select("file"),
      },
      (data) => ({
        errors: true,
        writeErrorFile: data.file,
      })
    )
    .exhaustive();
}
