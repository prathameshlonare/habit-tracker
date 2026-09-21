import { cpSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = resolve(root, process.argv[2] || 'android');
const resDir = join(androidDir, 'app', 'src', 'main', 'res');
const manifestPath = join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');

const EXTRA_PERMISSIONS = [
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
];

if (!existsSync(resDir)) {
  console.error(`No native project at ${androidDir}. Run "npx cap add android" first.`);
  process.exit(1);
}

cpSync(join(root, 'resources', 'android-res'), resDir, { recursive: true });
console.log('Overlay copied: resources/android-res -> res/');

const gradleSrc = join(root, 'resources', 'android-app', 'build.gradle');
const gradleDst = join(androidDir, 'app', 'build.gradle');
cpSync(gradleSrc, gradleDst);
console.log('build.gradle overlaid (signingConfigs + env versions).');

let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('POST_NOTIFICATIONS')) {
  const anchor = '    <uses-permission android:name="android.permission.INTERNET" />';
  if (!manifest.includes(anchor)) {
    console.error('Manifest anchor not found; template may have changed.');
    process.exit(1);
  }
  const additions = EXTRA_PERMISSIONS.map((p) => `    <uses-permission android:name="${p}" />`).join('\n');
  manifest = manifest.replace(anchor, `${anchor}\n${additions}`);
  writeFileSync(manifestPath, manifest);
  console.log('Manifest permissions added.');
} else {
  console.log('Manifest permissions already present; skipped.');
}
console.log('Android customizations applied.');
