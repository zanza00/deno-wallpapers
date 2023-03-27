import { encode, Hash } from "chksum";
import { ImageMagick, IMagickImage } from "imagemagick";
import { formatDuration, getMilliseconds, intervalToDuration } from "date-fns";

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

export function get_elapsed_time(start_time: Date, end: Date) {
  const duration = intervalToDuration({
    start: start_time,
    end,
  });

  const elapsed = `${duration.seconds === 0 ? "" : formatDuration(duration)}`
    .concat(
      ` ${getMilliseconds(end - start_time)} milliseconds`,
    );
  return elapsed;
}
