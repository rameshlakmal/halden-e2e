// Runs a command with extra environment variables, the same way on Windows and Unix shells.
// Usage: node scripts/with-env.ts NAME=value [NAME=value ...] -- command [args...]
import { spawn } from 'node:child_process';

const split = process.argv.indexOf('--');
if (split === -1 || split === process.argv.length - 1) {
  console.error('Usage: node scripts/with-env.ts NAME=value ... -- command [args...]');
  process.exit(2);
}
const vars = Object.fromEntries(process.argv.slice(2, split).map((pair) => {
  const at = pair.indexOf('=');
  return [pair.slice(0, at), pair.slice(at + 1)];
}));
const [command = '', ...args] = process.argv.slice(split + 1);
const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...vars }, shell: process.platform === 'win32' });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 130 : 1)));
