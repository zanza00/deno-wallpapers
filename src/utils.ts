import { encode, Hash } from "chksum";
import { ImageMagick, IMagickImage } from "imagemagick";

export function get_md5_hash(v: string): string {
  return new Hash("md5").digest(encode(v)).hex();
}

export function get_image_dimensions(data: Uint8Array) {
  return ImageMagick.read(data, (img: IMagickImage) => {
    return { width: img.width, height: img.height };
  });
}

export function percentage(count: number, total_files: number): string {
  return (count / total_files * 100).toFixed(2) + "%";
}

export function date_file_fmt(d: Date) {
  return d.toISOString().replaceAll(":", "-");
}
