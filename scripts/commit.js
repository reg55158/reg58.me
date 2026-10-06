// Usage: node scripts/commit.js "<message>"
// Type-checks, stages everything, and commits. Stops at the first failure.
import { spawnSync } from 'node:child_process';

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
	console.error('A commit message is required.');
	process.exit(1);
}

function run(label, command, args, options = {}) {
	console.log(`\n▶ ${label}`);
	const result = spawnSync(command, args, { stdio: 'inherit', ...options });
	if (result.status !== 0) {
		console.error(`\n✖ ${label} failed. Nothing was committed.`);
		process.exit(result.status ?? 1);
	}
}

// Fixed command with no user input, so a shell is safe here (needed to run npm.cmd on Windows).
run('Type-checking', 'npm run check', [], { shell: true });

const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (!status.stdout.trim()) {
	console.log('\nNo changes to commit.');
	process.exit(0);
}

run('Staging changes', 'git', ['add', '-A']);
// No shell: the message is passed as a single argument, so quotes or symbols can't break it.
run('Committing', 'git', ['commit', '-m', message]);

console.log('\n✔ Committed. Run "Deploy" to publish it to reg58.me.');
