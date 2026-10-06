<!--
	Full-width Gulf livery stripe: navy pinstripe, orange band, navy pinstripe, rising left to right.
	Drawn as SVG shapes rather than a skewed CSS gradient: the browser always anti-aliases vector
	edges, whereas a transformed gradient can render jagged while other parts of the page animate.

	As you scroll, an F1 car drives along the stripe and paints the orange band behind it.
	Without JavaScript, or with reduced motion requested, the stripe simply shows complete.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	// Stripe geometry in px (the SVG is a fixed 110px tall, so these map 1:1 vertically).
	const RISE = 46; // how much lower the left end sits than the right end
	const THICKNESS = 64;
	const BAND_CENTRE = 32; // middle of the orange band, measured from the stripe's top edge
	const CAR_WIDTH = 120;
	const CAR_HEIGHT = 40;

	const uid = $props.id();

	let wrap: HTMLDivElement;
	let animated = $state(false);
	let width = $state(1000);
	let progress = $state(1); // 0 = car off-screen left, 1 = car gone off-screen right
	let speed = $state(0); // 0–1, drives the speed lines

	// Where the car's tail sits at the top of the page: fully on screen, with a short orange trail behind it.
	const START = 40;
	// The car's left edge travels from START to just past the right edge (fully off screen).
	let carLeft = $derived(START + progress * (width - START));
	// Follow the slope: the band's centre rises from left to right.
	let carCentreX = $derived(carLeft + CAR_WIDTH / 2);
	let carTop = $derived(RISE * (1 - carCentreX / width) + BAND_CENTRE - CAR_HEIGHT / 2);
	let angle = $derived(-Math.atan2(RISE, width));
	// The orange is painted up to the car's tail.
	let paintedTo = $derived(Math.min(1, Math.max(0, carLeft / width)));

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		animated = true;

		let lastProgress = progress;
		let calmTimer: ReturnType<typeof setTimeout>;

		// Browsers already fire scroll events at most once per frame, so update directly.
		const update = () => {
			const rect = wrap.getBoundingClientRect();
			width = rect.width;
			// 0 at the very top of the page; 1 at the moment the stripe disappears under the nav bar.
			const navBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
			const finishScroll = rect.bottom + scrollY - navBottom;
			progress = finishScroll > 0 ? Math.min(1, Math.max(0, scrollY / finishScroll)) : 1;

			// Faster scrolling = stronger speed lines; they fade out shortly after scrolling stops.
			// Any movement shows the lines at 40%; quick scrolling takes them up to 70%.
			const delta = Math.abs(progress - lastProgress);
			speed = delta > 0 ? Math.min(0.7, 0.4 + delta * 15) : 0;
			lastProgress = progress;
			clearTimeout(calmTimer);
			calmTimer = setTimeout(() => (speed = 0), 250);
		};

		update();
		speed = 0;
		addEventListener('scroll', update, { passive: true });
		addEventListener('resize', update);

		return () => {
			clearTimeout(calmTimer);
			removeEventListener('scroll', update);
			removeEventListener('resize', update);
		};
	});
</script>

<div class="wrap" bind:this={wrap} aria-hidden="true">
	<svg class="livery" viewBox="0 0 1000 {RISE + THICKNESS}" preserveAspectRatio="none">
		<defs>
			<clipPath id="{uid}-painted">
				<rect x="0" y="0" width={paintedTo * 1000} height={RISE + THICKNESS} />
			</clipPath>
		</defs>
		<polygon points="0,{RISE} 1000,0 1000,6 0,{RISE + 6}" fill="var(--navy)" />
		<polygon
			points="0,{RISE + 12} 1000,12 1000,52 0,{RISE + 52}"
			fill="var(--gulf-orange)"
			clip-path={animated ? `url(#${uid}-painted)` : undefined}
		/>
		<polygon points="0,{RISE + 58} 1000,58 1000,64 0,{RISE + 64}" fill="var(--navy)" />
	</svg>

	{#if animated}
		<div class="car" style:transform="translate3d({carLeft}px, {carTop}px, 0) rotate({angle}rad)">
			<span class="speed-lines" class:moving={speed > 0} style:opacity={speed}></span>
			<!-- Top-down F1 car in Gulf livery colours (no logos), nose pointing right -->
			<svg viewBox="0 0 120 40" width={CAR_WIDTH} height={CAR_HEIGHT}>
				<!-- suspension arms -->
				<g stroke="var(--navy)" stroke-width="1.2">
					<line x1="20" y1="8" x2="28" y2="15" />
					<line x1="20" y1="32" x2="28" y2="25" />
					<line x1="89" y1="8" x2="82" y2="16" />
					<line x1="89" y1="32" x2="82" y2="24" />
				</g>
				<!-- tyres -->
				<g fill="var(--navy)">
					<rect x="12" y="0.5" width="17" height="8.5" rx="2.5" />
					<rect x="12" y="31" width="17" height="8.5" rx="2.5" />
					<rect x="82" y="2" width="14" height="7" rx="2" />
					<rect x="82" y="31" width="14" height="7" rx="2" />
				</g>
				<!-- rear wing -->
				<rect x="2" y="5" width="8" height="30" rx="1.5" fill="var(--navy)" />
				<rect x="3.5" y="6.5" width="5" height="27" rx="1" fill="var(--gulf-orange)" />
				<!-- body: narrow at the back, wide sidepods, long tapering nose -->
				<path
					d="M10 15 L36 13 Q44 8 56 9 L70 11 Q78 14 86 16 L116 18.5 Q119 20 116 21.5 L86 24 Q78 26 70 29 L56 31 Q44 32 36 27 L10 25 Z"
					fill="var(--gulf-blue)"
					stroke="var(--navy)"
					stroke-width="1.2"
					stroke-linejoin="round"
				/>
				<!-- Gulf orange stripe down the centreline -->
				<path d="M12 18 L104 18.8 L116 19.6 L116 20.4 L104 21.2 L12 22 Z" fill="var(--gulf-orange)" />
				<!-- cockpit, helmet and halo -->
				<ellipse cx="62" cy="20" rx="8" ry="4.6" fill="var(--navy)" />
				<circle cx="60" cy="20" r="2.8" fill="var(--gulf-orange)" />
				<path d="M56 16 Q70 13.5 72 20 Q70 26.5 56 24" fill="none" stroke="var(--navy)" stroke-width="1.6" />
				<!-- front wing -->
				<rect x="106" y="3" width="8" height="34" rx="1.5" fill="var(--navy)" />
				<rect x="107.5" y="4.5" width="5" height="31" rx="1" fill="var(--gulf-blue)" />
			</svg>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		/* Lets the car drive in and out past the screen edges without causing sideways scroll */
		overflow: hidden;
	}

	.livery {
		display: block;
		width: 100%;
		height: 110px;
	}

	.car {
		position: absolute;
		top: 0;
		left: 0;
		width: 120px;
		height: 40px;
		will-change: transform;
	}

	.car svg {
		display: block;
		position: relative;
	}

	/* Three trailing lines behind the car, shown while scrolling quickly */
	.speed-lines {
		position: absolute;
		right: 100%;
		top: 7px;
		width: 80px;
		height: 26px;
		background:
			linear-gradient(var(--navy), var(--navy)) 100% 2px / 70% 3px no-repeat,
			linear-gradient(var(--navy), var(--navy)) 100% 11px / 100% 3px no-repeat,
			linear-gradient(var(--navy), var(--navy)) 100% 20px / 55% 3px no-repeat;
		/* Slow fade out once scrolling stops... */
		transition: opacity 1.2s ease-out;
	}

	/* ...but appear quickly when scrolling starts */
	.speed-lines.moving {
		transition: opacity 0.15s ease-out;
	}
</style>
