import * as path from "std/path/mod.ts";
import { any, z } from "zod";
import { parse } from "std/flags/mod.ts";
import { match, P } from "ts-pattern";

const APP_NAME = `pixel_mage`;

const boolean_or_path = z.union([z.string(), z.boolean()]).optional();

export const AppArgs = z.object({
  _: z.array(z.string()).max(1).optional(),
  config: z.string().optional(),
  "app-folder": z.string().optional(),
  cache: boolean_or_path,
  log: z.boolean().optional(),
  "display-log": z.boolean().optional(),
  "file-log": z.boolean().optional(),
  error: z.boolean().optional(),
  "display-errors": z.boolean().optional(),
  "file-errors": z.boolean().optional(),
  quiet: z.boolean().optional(),
  "images-to-remove": z.array(z.string()).optional(),
  "min-width": z.number().optional(),
  "min-height": z.number().optional(),
  "over-max-action": z
    .union([z.literal("resize"), z.literal("delete")])
    .optional(),
  "max-width": z.number().optional(),
  "max-height": z.number().optional(),
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
  console.log({ raw_args, args });
  const parsed_args = AppArgs.safeParse(args);
  if (parsed_args.success) {
    console.log(parsed_args.data);
  } else {
    console.log(parsed_args.error);
  }

  return parsed_args;
}

function mergeDefaults(a: AppArgs): Config {
  const targetFolder = (a._ ?? [Deno.cwd()])[0];
  const appFolderName = a["app-folder"] ?? `.${APP_NAME}`;

  const cache = getCache(a, targetFolder, appFolderName);

  return {
    target: targetFolder,
    appFolder,
    cache,
  };
}

type LogConfig = {
  logs: "full" | "none";
  displayLogs: boolean;
  writeLogFile: boolean;
};

export type Config = {
  target: string; //_

  appFolder: string; // default target/cli_name

  cache: false | string; // deault cli_folder/cache.json

  errors: "full" | "none";
  displayErrors: boolean;
  writeErrorFile: false | string;

  imagesToRemove: hash[];

  minWidth: number;
  minHeight: number;

  overMaxAction: false | "resize" | "delete";

  maxWidth: number;
  maxHeight: number;
} & LogConfig;

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

function getLogs({
  log,
  "file-log": file,
  "display-log": display,
}: AppArgs): LogConfig {
  return match({ log, file, display })
    .with({ log: false, display: P.any, file: P.any }, () => ({
      logs: "none" as const,
      displayLogs: false,
      writeLogFile: false,
    }))
    .with(
      { log: undefined, display: P.select("display"), file: P.select("file") },
      (data) => {
        const logs =
          data.display !== false || data.file !== false ? "full" : "none";
        return {
          logs,
          displayLogs: data.display ?? true,
          writeLogFile: data.file ?? true,
        };
      }
    )
    .with(
      { log: true, display: P.select("display"), file: P.select("file") },
      (data) => {
        const logs =
          data.display !== false || data.file !== false ? "full" : "none";
        return {
          logs,
          displayLogs: data.display ?? true,
          writeLogFile: data.file ?? true,
        };
      }
    )
    .exhaustive() as LogConfig;
}
