/**
 * Publishes --dock-width-left/right on :root — the distance from each viewport
 * edge to the host's phone frame, which devCard.css reads so the docks fill
 * edge-to-phone instead of a fixed width. The frame is drawn by a transform
 * (--fit), so its on-screen edge can only be measured, not written. No frame
 * on the page (a bare standalone checkout) → nothing published, devCard.css
 * falls back to its fixed band.
 */
const EDGE_GUTTER = 12;
const PHONE_GUTTER = 15;

export function publishDockWidths(frame: HTMLElement): () => void {
	const root = document.documentElement.style;
	const apply = () => {
		const r = frame.getBoundingClientRect();
		const left = Math.max(0, r.left - EDGE_GUTTER - PHONE_GUTTER);
		const right = Math.max(0, window.innerWidth - r.right - EDGE_GUTTER - PHONE_GUTTER);
		root.setProperty("--dock-width-left", `${Math.round(left)}px`);
		root.setProperty("--dock-width-right", `${Math.round(right)}px`);
	};
	apply();
	const ro = new ResizeObserver(apply);
	ro.observe(frame);
	ro.observe(document.documentElement);
	window.addEventListener("resize", apply);
	return () => {
		ro.disconnect();
		window.removeEventListener("resize", apply);
		root.removeProperty("--dock-width-left");
		root.removeProperty("--dock-width-right");
	};
}
