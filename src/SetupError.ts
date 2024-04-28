import { Data } from "effect";

export class SetupError extends Data.TaggedError("SetupError")<{
  err: unknown;
  message: string;
}> {
}
