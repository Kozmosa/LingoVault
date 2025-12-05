import { getVersion } from '@tauri-apps/api/app';
import { cacheDir, join } from '@tauri-apps/api/path';
import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';

interface UpdateManifest {
  version: string;
  notes?: string;
  android?: {
    version: string;
    url: string;
  };
}

interface AndroidUpdateStrings {
  promptTitle: string;
  promptBody: (version: string, notes: string) => string;
  promptConfirm: string;
  promptCancel: string;
  downloadToast: string;
  installToast: string;
  configMissing: string;
  checkError: (reason: string) => string;
  installError: (reason: string) => string;
  alreadyLatest: string;
}

interface AndroidUpdateOptions {
  manifestUrl: string;
  strings: AndroidUpdateStrings;
  onStatus?: (message: string) => void;
  notify?: (message: string, options?: { variant?: 'info' | 'error' | 'success'; duration?: number }) => void;
}

type DownloadMirror = 'global' | 'china';

// Toggle mirror preference here if a China-optimized CDN is required.
let DOWNLOAD_MIRROR: DownloadMirror = 'china';

const buildDownloadUrl = (sourceUrl: string): string => {
  if (!sourceUrl) return sourceUrl;
  return DOWNLOAD_MIRROR === 'china'
    ? `https://fastgit.cc/${sourceUrl}`
    : sourceUrl;
};

const compareVersions = (remote: string, current: string) => {
  const remoteParts = remote.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  const length = Math.max(remoteParts.length, currentParts.length);

  for (let i = 0; i < length; i += 1) {
    const remoteVal = remoteParts[i] ?? 0;
    const currentVal = currentParts[i] ?? 0;
    if (remoteVal > currentVal) return 1;
    if (remoteVal < currentVal) return -1;
  }
  return 0;
};

const fetchManifest = async (manifestUrl: string): Promise<UpdateManifest> => {
  const response = await fetch(`${manifestUrl}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

const notifyStatus = (handler: AndroidUpdateOptions['onStatus'], text: string) => {
  if (handler) {
    handler(text);
  }
};

const notifyFrontend = (
  handler: AndroidUpdateOptions['notify'],
  text: string,
  options?: { variant?: 'info' | 'error' | 'success'; duration?: number }
) => {
  if (handler) {
    handler(text, options);
  }
};

const LOG_DELAY_MS = 10_000;

/*
const downloadApk = async (url: string, fileName: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(fileName, new Uint8Array(buffer), { baseDir: BaseDirectory.Cache });

  const cachePath = await cacheDir();
  return join(cachePath, fileName);
};
*/

// const openSystemTarget = async (target: string) => {
//   const openerModule = await import('@tauri-apps/plugin-opener');
//   const handler = (openerModule as { open?: (target: string) => Promise<void> }).open
//     ?? (openerModule as { default?: (target: string) => Promise<void> }).default;

//   if (typeof handler !== 'function') {
//     throw new Error('opener plugin unavailable');
//   }

//   await handler(target);
// };

const openSystemTarget = async (target: string) => {
  try {
    await openUrl(target);
  } catch (err) {
    console.error('Failed to open URL:', err);
    throw new Error('opener plugin unavailable!');
  }
};

export const checkAndroidUpdate = async ({ manifestUrl, strings, onStatus, notify }: AndroidUpdateOptions) => {
  const logs: string[] = [];
  const log = (text: string) => {
    const stamp = new Date().toISOString();
    logs.push(`[${stamp}] ${text}`);
  };

  const logDelay = new Promise<void>((resolve) => {
    setTimeout(resolve, LOG_DELAY_MS);
  });

  log('Android update check invoked.');
  log(`Manifest endpoint: ${manifestUrl}`);

  try {
    log('Resolving current app version.');
    const currentVersion = await getVersion();
    log(`Current version detected: v${currentVersion}`);

    log('Fetching remote manifest.');
    const manifest = await fetchManifest(manifestUrl);
    log(`Manifest fetched (app v${manifest.version ?? 'unknown'})`);
    const androidConfig = manifest.android;
    log(`Android manifest entry: ${androidConfig ? `v${androidConfig.version} @ ${androidConfig.url}` : 'missing'}`);
    const normalizedNotes = (manifest.notes ?? '').trim();
    if (normalizedNotes) {
      log(`Release notes: ${normalizedNotes.replace(/\s+/g, ' ')}`);
    }

    if (!androidConfig?.url || !androidConfig.version) {
      log('Manifest missing Android URL or version. Aborting.');
      notifyFrontend(notify, strings.configMissing, { variant: 'error', duration: 6000 });
      return;
    }

    if (compareVersions(androidConfig.version, currentVersion) <= 0) {
      log(`Remote version v${androidConfig.version} is not newer than current v${currentVersion}.`);
      notifyFrontend(notify, strings.alreadyLatest, { variant: 'info', duration: 4000 });
      return;
    }

    log(`Prompting user to install v${androidConfig.version}.`);
    const shouldUpdate = await ask(strings.promptBody(androidConfig.version, manifest.notes ?? ''), {
      title: strings.promptTitle,
      okLabel: strings.promptConfirm,
      cancelLabel: strings.promptCancel,
    });

    log(`User response: ${shouldUpdate ? 'confirmed update' : 'declined update'}.`);
    if (!shouldUpdate) {
      return;
    }

    const resolvedUrl = buildDownloadUrl(androidConfig.url);
    log(`Resolved download URL (${DOWNLOAD_MIRROR}): ${resolvedUrl}`);

    log('Opening system browser for manual installation.');
    notifyStatus(onStatus, strings.downloadToast);
    log(`Status notified: ${strings.downloadToast}`);
    try {
      await openSystemTarget(resolvedUrl);
      log('System browser launched successfully.');
      notifyStatus(onStatus, strings.installToast);
      log(`Status notified: ${strings.installToast}`);
    } catch (installError) {
      const messageText = installError instanceof Error ? installError.message : String(installError);
      log(`System browser launch failed: ${messageText}`);
      notifyFrontend(notify, strings.installError(messageText), { variant: 'error', duration: 6000 });
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    log(`Update check failed: ${messageText}`);
    notifyFrontend(notify, strings.checkError(messageText), { variant: 'error', duration: 6000 });
  } finally {
    log('Update check flow finished. Awaiting log display.');
    await logDelay;
    const logBody = logs.join('\n') || '[no log entries]';
    notifyFrontend(notify, `${strings.promptTitle} · Logs\n${logBody}`, {
      variant: 'info',
      duration: 10000
    });
  }
};
