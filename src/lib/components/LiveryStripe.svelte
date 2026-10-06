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
	const CAR_WIDTH = 127; // the car's drawing is 270×100, scaled to fit the stripe
	const CAR_HEIGHT = 47;

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
			const navBottom = document.querySelector<HTMLElement>('[data-site-header]')?.getBoundingClientRect().bottom ?? 0;
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
			<!--
				Top-down F1 car in 2026 proportions and Gulf livery colours (no logos), nose right.
				2026 rules: shorter wheelbase, narrower tyres, a narrower front wing, no beam wing,
				slimmer sidepods. Drawn at 270×100 and scaled down.
			-->
			<svg viewBox="0 0 270 100" width={CAR_WIDTH} height={CAR_HEIGHT} overflow="visible">
				<defs>
					<!-- body shading: lighter down the middle, darker at the edges, so it looks rounded -->
					<linearGradient id="{uid}-body" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="#5fa8d4" />
						<stop offset="0.5" stop-color="#b3e2f8" />
						<stop offset="1" stop-color="#5fa8d4" />
					</linearGradient>
					<filter id="{uid}-shadow" x="-10%" y="-30%" width="120%" height="160%">
						<feGaussianBlur stdDeviation="5" />
					</filter>
				</defs>

				<!-- soft shadow on the track -->
				<ellipse cx="136" cy="56" rx="126" ry="40" fill="#0b1722" opacity="0.3" filter="url(#{uid}-shadow)" />

				<!-- floor (the dark carbon edge visible around the bodywork) -->
				<path
					d="M40 38 L68 31 L92 18 Q126 13 162 18 L188 33 L200 40 L200 60 L188 67 L162 82 Q126 87 92 82 L68 69 L40 62 Z"
					fill="#17222d"
				/>

				<!-- suspension arms -->
				<g stroke="#0b1722" stroke-width="2.4" stroke-linecap="round">
					<line x1="51" y1="21" x2="66" y2="40" />
					<line x1="59" y1="21" x2="84" y2="37" />
					<line x1="51" y1="79" x2="66" y2="60" />
					<line x1="59" y1="79" x2="84" y2="63" />
					<line x1="210" y1="23" x2="194" y2="44" />
					<line x1="218" y1="23" x2="202" y2="46" />
					<line x1="210" y1="77" x2="194" y2="56" />
					<line x1="218" y1="77" x2="202" y2="54" />
				</g>

				<!-- tyres: narrower for 2026, rears still wider than fronts, with a sheen along the tread -->
				<g fill="#121417">
					<rect x="30" y="2" width="42" height="21" rx="6" />
					<rect x="30" y="77" width="42" height="21" rx="6" />
					<rect x="196" y="6" width="32" height="18" rx="5" />
					<rect x="196" y="76" width="32" height="18" rx="5" />
				</g>
				<g fill="#3a4048" opacity="0.8">
					<rect x="34" y="4.5" width="34" height="2.5" rx="1.25" />
					<rect x="34" y="93" width="34" height="2.5" rx="1.25" />
					<rect x="199" y="8.5" width="26" height="2.2" rx="1.1" />
					<rect x="199" y="89.3" width="26" height="2.2" rx="1.1" />
				</g>

				<!-- front wing: narrower for 2026 (inside the front tyres' outer edges), three elements;
				     the last (blue) is the active-aero flap -->
				<rect x="234" y="8" width="8" height="84" rx="2" fill="#0b1722" />
				<rect x="243" y="11" width="5" height="78" rx="2" fill="var(--gulf-orange)" />
				<rect x="249" y="14" width="5" height="72" rx="2" fill="var(--gulf-blue)" />
				<rect x="232" y="5" width="26" height="4" rx="1.5" fill="#0b1722" />
				<rect x="232" y="91" width="26" height="4" rx="1.5" fill="#0b1722" />

				<!-- rear wing: two elements (the blue top flap is active aero), no beam wing below -->
				<rect x="24" y="45" width="20" height="10" rx="2" fill="#0b1722" />
				<rect x="6" y="12" width="20" height="76" rx="3" fill="#0b1722" />
				<rect x="9" y="15" width="7" height="70" rx="2" fill="var(--gulf-orange)" />
				<rect x="18" y="15" width="6" height="70" rx="2" fill="var(--gulf-blue)" />
				<rect x="4" y="9" width="24" height="5" rx="1.5" fill="#0b1722" />
				<rect x="4" y="86" width="24" height="5" rx="1.5" fill="#0b1722" />

				<!-- bodywork: narrow gearbox, slim sidepods, cockpit, shorter nose -->
				<path
					d="M36 42 L60 40 Q76 38 90 31 Q98 20 118 19 L154 19 Q166 20 172 29 L178 38 L192 42 L238 46 Q251 48 253 50 Q251 52 238 54 L192 58 L178 62 L172 71 Q166 80 154 81 L118 81 Q98 80 90 69 Q76 62 60 60 L36 58 Z"
					fill="url(#{uid}-body)"
					stroke="#0b1722"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>

				<!-- sidepod cooling inlets -->
				<g fill="#0b1722">
					<path d="M148 20.5 Q160 20 167 27 L159 28 Q155 23.5 148 22.5 Z" />
					<path d="M148 79.5 Q160 80 167 73 L159 72 Q155 76.5 148 77.5 Z" />
				</g>

				<!-- Gulf orange centre stripe with navy pinstripes, nose to tail -->
				<path d="M38 45.5 L140 44.5 L192 46 L250 48.4 L250 51.6 L192 54 L140 55.5 L38 54.5 Z" fill="#0b1722" />
				<path d="M38 47 L140 46 L192 47.5 L250 49.2 L250 50.8 L192 52.5 L140 54 L38 53 Z" fill="var(--gulf-orange)" />

				<!-- gloss highlights along the sidepods -->
				<g fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.45">
					<path d="M100 24 Q120 20 146 21.5" />
					<path d="M100 76 Q120 80 146 78.5" />
				</g>

				<!-- airbox intake above the driver's head -->
				<ellipse cx="128" cy="50" rx="7" ry="5.5" fill="#0b1722" stroke="var(--gulf-orange)" stroke-width="1.2" />

				<!-- cockpit, helmet (orange with a navy visor) and halo -->
				<ellipse cx="158" cy="50" rx="13" ry="8.5" fill="#0b1722" />
				<circle cx="155" cy="50" r="6.2" fill="var(--gulf-orange)" />
				<ellipse cx="159.3" cy="50" rx="2.1" ry="4.2" fill="#0b1722" />
				<path
					d="M143 41.5 Q152 37.5 167 41.5 Q176 44 176 50 Q176 56 167 58.5 Q152 62.5 143 58.5"
					fill="none"
					stroke="#26313d"
					stroke-width="2.6"
				/>
				<line x1="176" y1="50" x2="182" y2="50" stroke="#26313d" stroke-width="2.4" />

				<!-- mirrors -->
				<g fill="#0b1722">
					<rect x="168" y="28" width="7" height="5" rx="1.5" />
					<rect x="168" y="67" width="7" height="5" rx="1.5" />
				</g>
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
		width: 127px;
		height: 47px;
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
		top: 10px;
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
