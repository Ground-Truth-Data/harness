/**
 * THE PHONE FRAME, AS A FACT ANY COMPONENT CAN ASK FOR.
 *
 * Two things depend on it and both used to guess: a side card needs to know
 * whether there is a gutter to sit in, and the lane needs the frame's measured
 * width. Both were answered with a media query and a mount-time
 * querySelector — which is wrong twice over. The frame is drawn by the
 * (getcache) layout, so at a page component's onMount it may not exist yet;
 * and the layout's own rule is route-dependent (debug routes opt out), so a
 * media query can say "wide" on a page that has no frame.
 *
 * So: watch the DOM for the frame, publish the widths while it is there, and
 * report presence. One observer, one answer, every caller.
 */
import { publishDockWidths } from "$rig/dev/dockWidths";

export function watchPhoneFrame(onChange: (present: boolean) => void): () => void {
	let stopWidths: (() => void) | undefined;
	let current: HTMLElement | null = null;

	const sync = () => {
		const frame = document.querySelector<HTMLElement>(".mobile-preview-frame");
		if (frame === current) return;
		stopWidths?.();
		stopWidths = undefined;
		current = frame;
		if (frame) stopWidths = publishDockWidths(frame);
		onChange(!!frame);
	};

	sync();
	const mo = new MutationObserver(sync);
	mo.observe(document.body, { childList: true, subtree: true });
	return () => {
		mo.disconnect();
		stopWidths?.();
	};
}
