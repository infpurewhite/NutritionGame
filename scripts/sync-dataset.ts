/**
 * `npm run data:sync`: copy the pinned andean-crops dataset into this repo.
 *
 * Downloads the file named in `data/andean-crops/PIN.json` and compares its
 * sha256 with the pin. The published URL always serves the latest release, so
 * the checksum is what pins the version.
 *
 * - Checksum matches: the snapshot is (re)written unchanged.
 * - Checksum differs: nothing is written and the script exits 1, unless
 *   `--update-pin` is given. With it, the snapshot and the pin are replaced;
 *   run `npm run build` afterwards so the new file is validated.
 *
 * Behind an HTTP proxy, run with NODE_USE_ENV_PROXY=1.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const SNAPSHOT = 'data/andean-crops/andean-crops.json';
const PIN = 'data/andean-crops/PIN.json';

interface Pin {
  name: string;
  version: string;
  sourceUrl: string;
  sha256: string;
  retrievedOn: string;
}

async function main(): Promise<number> {
  const root = process.cwd();
  const updatePin = process.argv.includes('--update-pin');
  const pin = JSON.parse(readFileSync(join(root, PIN), 'utf8')) as Pin;

  const response = await fetch(pin.sourceUrl);
  if (!response.ok) {
    process.stderr.write(`Download failed: HTTP ${response.status} from ${pin.sourceUrl}\n`);
    return 1;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const metadata = (JSON.parse(bytes.toString('utf8')) as { metadata?: Partial<Pin> & { title?: string } })
    .metadata;
  const version = String(metadata?.version ?? 'unknown');

  if (sha256 === pin.sha256) {
    writeFileSync(join(root, SNAPSHOT), bytes);
    process.stdout.write(`Snapshot matches the pin: ${pin.name} ${pin.version} (${sha256}).\n`);
    return 0;
  }
  if (!updatePin) {
    process.stderr.write(
      `The published dataset differs from the pin.\n` +
        `  pinned:    ${pin.version} ${pin.sha256}\n` +
        `  published: ${version} ${sha256}\n` +
        `Nothing was written. Re-run with --update-pin to move to the published file.\n`,
    );
    return 1;
  }
  writeFileSync(join(root, SNAPSHOT), bytes);
  const next: Pin = {
    name: String(metadata?.title ?? pin.name),
    version,
    sourceUrl: pin.sourceUrl,
    sha256,
    retrievedOn: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(join(root, PIN), `${JSON.stringify(next, null, 2)}\n`);
  process.stdout.write(`Pin moved to ${version} (${sha256}). Run "npm run build" to validate it.\n`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
