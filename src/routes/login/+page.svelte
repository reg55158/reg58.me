<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	// Named actions replace the query string, so carry ?redirectTo= along explicitly.
	let redirectTo = $derived(page.url.searchParams.get('redirectTo'));
	const action = (name: string) =>
		`?/${name}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;

	const submit: SubmitFunction = () => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	};
</script>

<svelte:head>
	<title>Login</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="container">
	<div class="card">
		<h1>Owner login</h1>
		{#if data.configured && data.step === 'code'}
			<p class="muted">Enter the 6-digit code from your authenticator app.</p>
			<form method="POST" action={action('code')} use:enhance={submit}>
				<label for="code">Code</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					id="code"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="[0-9 ]*"
					maxlength="7"
					placeholder="123 456"
					required
					autofocus
				/>
				<label class="remember">
					<input type="checkbox" name="remember" />
					Remember this device for 30 days
				</label>
				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}
				<button class="btn primary" disabled={submitting}>
					{submitting ? 'Checking…' : 'Verify'}
				</button>
			</form>
			<form method="POST" action={action('restart')} use:enhance={submit}>
				<button class="link">Start again</button>
			</form>
		{:else if data.configured}
			<p class="muted">This area is private.</p>
			<form method="POST" action={action('password')} use:enhance={submit}>
				<label for="password">Password</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					autofocus
				/>
				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}
				<button class="btn primary" disabled={submitting}>
					{submitting ? 'Checking…' : 'Log in'}
				</button>
			</form>
		{:else}
			<p class="muted">
				Login hasn't been set up yet. On the server, run <code>npm run set-password</code> and restart.
			</p>
		{/if}
	</div>
</section>

<style>
	section {
		display: flex;
		justify-content: center;
		margin-top: 96px;
	}

	.card {
		width: 100%;
		max-width: 380px;
		padding: 32px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}

	h1 {
		font-size: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 16px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	input {
		font: inherit;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
	}

	.error {
		color: var(--danger);
		margin: 0;
		font-size: 0.9rem;
	}

	button {
		margin-top: 8px;
	}

	#code {
		font-family: var(--mono);
		font-size: 1.4rem;
		letter-spacing: 0.2em;
		text-align: center;
	}

	.remember {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 400;
		cursor: pointer;
	}

	.remember input {
		padding: 0;
		width: 18px;
		height: 18px;
		accent-color: var(--gulf-orange);
	}

	.link {
		align-self: center;
		background: none;
		border: 0;
		padding: 0;
		margin: 0;
		font: inherit;
		font-size: 0.9rem;
		color: var(--text-muted);
		text-decoration: underline;
		cursor: pointer;
	}

	code {
		font-family: var(--mono);
		font-size: 0.9em;
	}
</style>
