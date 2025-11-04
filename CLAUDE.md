# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`deno-wallpapers` (internally named `pixel_mage`) is a Deno-based CLI tool for managing large wallpaper directories. It scans image files, validates their dimensions and checksums, caches processing results, and removes unwanted images based on configurable criteria.

## Commands

### Running the Application
```bash
deno task start                    # Run with default settings (current directory)
deno task start /path/to/wallpapers # Run on specific directory
```

### Direct Execution
```bash
deno run -A cli.ts [options] [target_directory]
```

## Architecture

### Entry Point Flow
1. `cli.ts` - Entry point that calls `program()` from `src/mod.ts`
2. `src/mod.ts` - Main orchestrator that:
   - Sets up services (cache, logger, error handler)
   - Iterates through target directory
   - Delegates file processing to `handle_file.ts`
   - Removes identified directories and files
   - Reports results and cleanup

### Core Components

**Configuration System (`src/config.ts`)**
- Parses CLI arguments using Zod schemas
- Merges arguments with sensible defaults
- Uses `ts-pattern` for complex conditional logic
- App name: `pixel_mage`
- Default app folder: `.pixel_mage` in target directory

**Cache System (`src/cache.ts`)**
- JSON-based persistent cache stored in app folder
- Tracks processed files to avoid reprocessing
- Stores file state: empty string = valid, non-empty = deletion reason
- Supports graceful interruption with `last_exit` tracking
- Prunes cache on clean exit to remove deleted files

**File Handler (`src/handle_file.ts`)**
- Factory function that returns closure with injected dependencies
- Two-tier validation:
  1. Small files (<30KB): Check MD5 hash against blacklist
  2. Larger files: Validate dimensions using ImageMagick
- Marks files for deletion if they fail validation
- Uses cache to skip previously processed files

**Logger (`src/logger.ts`)**
- Dual output: stdout and file-based logging
- Buffered writes with configurable flush threshold (default: 10 messages)
- File naming: `log-{ISO_timestamp}.txt` in app folder
- Supports quiet mode

**Error Handler (`src/errors.ts`)**
- Writes errors to timestamped file in app folder
- Captures file name, timestamp, error details, and stack traces
- Can be disabled via CLI flags

**Utilities (`src/utils.ts`)**
- MD5 hashing via `chksum` library
- Image dimension reading via ImageMagick
- Time formatting helpers

**Setup (`src/setup.ts`)**
- Initializes all services (cache, logger, error handler)
- Configures ImageMagick
- Sets up SIGINT handler for graceful shutdown
- Returns teardown function for cleanup

### Data Flow

```
CLI args → Config → Setup (init services) → Main loop:
  For each file:
    Check cache → If cached: mark if needed, skip processing
               → If new: validate → mark if needed → cache result

  After scan:
    Delete marked directories
    Delete marked files
    Save cache (prune if clean exit)
    Write logs and teardown
```

### Key Configuration Options

- `--min-width`, `--min-height`: Minimum dimensions (default: 1920x1080)
- `--max-width`, `--max-height`: Maximum dimensions (default: 5000x5000)
- `--over-max-action`: Action for oversized images (resize|delete|none, default: none)
- `--images-to-remove`: Array of MD5 hashes to blacklist
- `--cache`, `-c`: Enable/disable cache or specify custom path
- `--log`, `-l`: Enable/disable console logging
- `--error`, `-e`: Enable/disable error logging
- `--quiet`, `-q`: Suppress all console output
- `--app-folder`, `-f`: Custom app folder name

### Progress Reporting

The application provides periodic progress updates during processing:
- Reports every ~0.5% of files (chunk = total/200)
- Throttled to max once per 5 seconds
- Shows percentage complete, elapsed time, and files marked for deletion

### Dependencies

- **Deno std library**: File system operations, path handling, CLI parsing
- **zod**: Schema validation for config and cache
- **ts-pattern**: Exhaustive pattern matching for config logic
- **chksum**: MD5 hashing for duplicate detection
- **imagemagick_deno**: Image dimension reading
- **date-fns**: Time calculations and formatting

## Development Notes

- TypeScript strict mode is enabled
- Cache format version is currently `1` (see `cacheDataSchema`)
- The tool assumes at least one directory argument (defaults to `Deno.cwd()`)
- App folder is created automatically if it doesn't exist
- SIGINT (Ctrl+C) triggers graceful shutdown with cache save
- Second SIGINT forces immediate exit
