import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const projectRoot = resolve(frontendRoot, '..', '..');
const backendRoot = resolve(projectRoot, 'app', 'backend');
const sharePublicDir = resolve(frontendRoot, '.share-public');
const distDir = resolve(frontendRoot, 'dist');

function canExecutePython(command) {
  if (!command) {
    return false;
  }

  const result = spawnSync(command, ['-c', 'import sys; print(sys.version)'], {
    stdio: 'ignore',
    shell: false,
  });

  return result.status === 0;
}

function resolvePythonCommand() {
  const explicitPython = process.env.BACKEND_PYTHON?.trim();
  if (explicitPython) {
    if (canExecutePython(explicitPython)) {
      return explicitPython;
    }

    throw new Error(`Configured BACKEND_PYTHON is not executable: ${explicitPython}`);
  }

  const windowsVenv = resolve(backendRoot, '.venv', 'Scripts', 'python.exe');
  if (existsSync(windowsVenv)) {
    return windowsVenv;
  }

  const posixVenv = resolve(backendRoot, '.venv', 'bin', 'python');
  if (existsSync(posixVenv)) {
    return posixVenv;
  }

  const ciCandidates = [];
  if (process.env.pythonLocation) {
    ciCandidates.push(
      process.platform === 'win32'
        ? resolve(process.env.pythonLocation, 'python.exe')
        : resolve(process.env.pythonLocation, 'bin', 'python'),
    );
  }
  ciCandidates.push('python3', 'python');

  for (const candidate of ciCandidates) {
    if (canExecutePython(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Backend Python was not found. Locally run scripts/Setup-Backend.ps1 to prepare app/backend/.venv, or set BACKEND_PYTHON in CI.',
  );
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
