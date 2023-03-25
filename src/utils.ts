
import { Hash, encode } from "https://deno.land/x/checksum@1.4.0/mod.ts";

export function get_md5_hash(v: string): string {
  return new Hash("md5").digest(encode(v)).hex();
}
