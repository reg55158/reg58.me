<!--
	Custom page scrollbar drawn over the page (mouse/trackpad users only).
	The browser's own scrollbar always takes a strip at the side that nothing can be drawn under,
	so we hide it; the nav bar, footer and livery stripe can then run edge to edge.
	Keyboard, wheel and touch scrolling are untouched, since the page itself still scrolls normally.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	const MIN_THUMB = 48;
	// Breathing room so the handle never touches the nav bar or the bottom of the window.
	const GAP = 8;

	let active = $state(false);
	let scrollable = $state(false); // false when the page is too short to scroll
	let dragging = $state(false);
	let trackTop = $state(0); // the track starts below the sticky nav bar
	let trackBottom = $state(GAP); // ...and ends above the footer (see update())
	let thumbTop = $state(0); // relative to the track
	let thumbHeight = $state(0);

	let dragStartY = 0;
	let dragStartScroll = 0;

	const trackHeight = () => innerHeight - trackTop - trackBottom;
	const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

	function update() {
		trackTop = (document.querySelector('header')?.getBoundingClientRect().height ?? 0) + GAP;
		// The footer can only rise as high as the bottom of the window (at the end of the page),
		// so ending the track one footer-height up means the handle never overlaps it.
		trackBottom = (document.querySelector('footer')?.offsetHeight ?? 0) + GAP;
		scrollable = maxScroll() > 1;
		if (!scrollable) return;
		// Thumb size reflects how much of the page is visible; position reflects how far down we are.
		thumbHeight = Math.max(
			MIN_THUMB,
			trackHeight() * (innerHeight / document.documentElement.scrollHeight)
		);
		thumbTop = (scrollY / maxScroll()) * (trackHeight() - thumbHeight);
	}

	function startDrag(e: PointerEvent) {
		e.preventDefault(); // stops text being selected while dragging
		e.stopPropagation(); // don't also trigger a track click
		dragging = true;
		dragStartY = e.clientY;
		dragStartScroll = scrollY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function drag(e: PointerEvent) {
		if (!dragging) return;
		// Moving the thumb by 1px scrolls the page by (scrollable distance ÷ thumb travel).
		const ratio = maxScroll() / (trackHeight() - thumbHeight);
		scrollTo(0, dragStartScroll + (e.clientY - dragStartY) * ratio);
	}

	function endDrag() {
		dragging = false;
	}

	// Clicking the empty track pages up or down, like a normal scrollbar.
	function trackClick(e: PointerEvent) {
		const clickY = e.clientY - trackTop;
		scrollBy({ top: clickY < thumbTop ? -innerHeight * 0.9 : innerHeight * 0.9 });
	}

	onMount(() => {
		if (!matchMedia('(pointer: fine)').matches) return;
		active = true;
		document.documentElement.classList.add('race-scrollbar');

		update();
		addEventListener('scroll', update, { passive: true });
		addEventListener('resize', update);
		// Page height can change after load (fonts, images, data), so watch it too.
		const resizeObserver = new ResizeObserver(update);
		resizeObserver.observe(document.body);

		return () => {
			document.documentElement.classList.remove('race-scrollbar');
			removeEventListener('scroll', update);
			removeEventListener('resize', update);
			resizeObserver.disconnect();
		};
	});
</script>

{#if active && scrollable}
	<!-- Mouse-only affordance: keyboard and assistive tech scroll the page natively, so hide it from them -->
	<div
		class="track"
		role="presentation"
		style:top="{trackTop}px"
		style:bottom="{trackBottom}px"
		onpointerdown={trackClick}
		aria-hidden="true"
	>
		<div
			class="thumb"
			role="presentation"
			class:dragging
			style:height="{thumbHeight}px"
			style:transform="translateY({thumbTop}px)"
			onpointerdown={startDrag}
			onpointermove={drag}
			onpointerup={endDrag}
			onpointercancel={endDrag}
		></div>
	</div>
{/if}

<style>
	/* Hide the browser's own page scrollbar while ours is running */
	:global(html.race-scrollbar) {
		scrollbar-width: none;
	}

	:global(html.race-scrollbar::-webkit-scrollbar) {
		display: none;
	}

	.track {
		position: fixed;
		right: 0;
		width: 18px;
		z-index: 50;
	}

	/* Gulf orange handle with a thin navy outline so it stays visible over orange cards and footer */
	.thumb {
		position: absolute;
		top: 0;
		right: 4px;
		width: 10px;
		border-radius: 999px;
		background-color: var(--gulf-orange);
		box-shadow: 0 0 0 1.5px var(--navy);
		touch-action: none;
	}

	/* Hovering or dragging darkens the orange */
	.thumb:hover,
	.thumb.dragging {
		background-color: #d4500a;
	}
</style>
