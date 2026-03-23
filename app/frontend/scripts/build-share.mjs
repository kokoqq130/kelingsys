import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const projectRoot = resolve(frontendRoot, '..', '..');
const backendRoot = resolve(projectRoot, 'app', 'backend');
const sharePublicDir = resolve(frontendRoot, '.share-public');
const distDir = resolve(frontendRoot, 'dist');

function resolvePythonCommand() {
  const windowsVenv = resolve(backendRoot, '.venv', 'Scripts', 'python.exe');
  if (existsSync(windowsVenv)) {
    return windowsVenv;
  }

  const posixVenv = resolve(backendRoot, '.venv', 'bin', 'python');
  if (existsSync(posixVenv)) {
    return posixVenv;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

function resolvePnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function run(command, args, options = {}) {
  const env = Object.fromEntries(
    Object.entries(options.env ?? process.env).filter(([, value]) => typeof value === 'string'),
  );

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });

    child.on('error', rejectPromise);
  });
}

async function main() {
  rmSync(sharePublicDir, { recursive: true, force: true });
  mkdirSync(sharePublicDir, { recursive: true });

  await run(
    resolvePythonCommand(),
    ['export_static_site.py', '--output-dir', sharePublicDir],
    {
      cwd: backendRoot,
      env: process.env,
    },
  );

  await run(resolvePnpmCommand(), ['exec', 'tsc', '-b'], {
    cwd: frontendRoot,
    env: process.env,
  });

  await run(resolvePnpmCommand(), ['exec', 'vite', 'build'], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_DATA_SOURCE: 'static',
      VITE_ROUTER_MODE: 'hash',
      VITE_SHARE_PUBLIC_DIR: sharePublicDir,
    },
  });

  if (existsSync(resolve(distDir, 'index.html'))) {
    copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
