# Agent Guidelines for deno-wallpapers

## Commands
- **Run**: `deno task start` (runs cli.ts with -A flag)
- **Lint**: `deno lint` (Deno built-in linter)
- **Format**: `deno fmt` (Deno built-in formatter)
- **Type check**: `deno check cli.ts` (checks main entry point and dependencies)
- **Test**: No test framework configured yet

## Code Style
- **Imports**: Use `std/` prefix for Deno standard library imports from deno.json imports map
- **Types**: Strict TypeScript enabled, use Zod for runtime validation and schema definitions
- **Error handling**: Use try/catch with console.error for logging, structured error handling via ErrorHandler class in errors.ts
- **Naming**: snake_case for functions/CLI args, camelCase for variables/methods, PascalCase for types/classes
- **Pattern matching**: Use ts-pattern library (with `match` and `P`) for complex conditional logic instead of if/else chains
- **Private fields**: Use `#` prefix for private class fields (e.g., `#files`, `#config`, `#logger`)
- **File structure**: Main entry point is cli.ts, core logic in src/mod.ts, utilities separated by concern (cache.ts, logger.ts, errors.ts, etc.)
- **Dependencies**: All external deps managed via deno.json imports map, prefer Deno-native modules over npm when possible
- **Async/Await**: Use async/await for all asynchronous operations, return Promise types explicitly when needed
- **Unused vars**: Prefix unused variables with underscore (e.g., `__error`, `_entry`)
- **Formatting**: Use `formatDuration` and `date-fns` for time/date formatting, not manual string manipulation