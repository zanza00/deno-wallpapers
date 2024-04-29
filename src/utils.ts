import { Hash, encode } from "chksum";
import { formatDuration, getMilliseconds, intervalToDuration } from "date-fns";
import { type IMagickImage, ImageMagick } from "imagemagick";

export function get_md5_hash(v: string): string {
	return new Hash("md5").digest(encode(v)).hex();
}

export function get_image_dimensions(data: Uint8Array) {
	return ImageMagick.read(data, (img: IMagickImage) => {
		return { width: img.width, height: img.height };
	});
}

export function percentage(count: number, total_files: number): string {
	return `${((count / total_files) * 100).toFixed(2)}%`;
}

export function date_file_fmt(d: Date) {
	return d.toISOString().replaceAll(":", "-");
}

export function get_elapsed_time(start_time: Date, end: Date) {
	const duration = intervalToDuration({
		start: start_time,
		end,
	});

	if (
		(duration.seconds ?? 0) +
			(duration.minutes ?? 0) +
			(duration.hours ?? 0) ===
		0
	) {
		const diff = Number(end) - Number(start_time);
		return `${getMilliseconds(diff)} milliseconds`;
	}

	return formatDuration(duration);
}
