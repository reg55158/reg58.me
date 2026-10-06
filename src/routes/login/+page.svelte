<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Login</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="container">
	<div class="card">
		<h1>Owner login</h1>
		{#if data.configured}
			<p class="muted">This area is private.</p>
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
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

	code {
		font-family: var(--mono);
		font-size: 0.9em;
	}
</style>
