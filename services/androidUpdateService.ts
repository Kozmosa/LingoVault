import { getVersion } from '@tauri-apps/api/app';
import { cacheDir, join } from '@tauri-apps/api/path';
import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { ask, message } from '@tauri-apps/plugin-dialog';

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
}

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

const openInstaller = async (filePath: string) => {
  const openerModule = await import('@tauri-apps/plugin-opener');
  const handler = (openerModule as { open?: (target: string) => Promise<void> }).open
    ?? (openerModule as { default?: (target: string) => Promise<void> }).default;

  if (typeof handler !== 'function') {
    throw new Error('opener plugin unavailable');
  }

  await handler(filePath);
};

export const checkAndroidUpdate = async ({ manifestUrl, strings, onStatus }: AndroidUpdateOptions) => {
  try {
    const currentVersion = await getVersion();
    const manifest = await fetchManifest(manifestUrl);
    const androidConfig = manifest.android;

    if (!androidConfig?.url || !androidConfig.version) {
      await message(strings.configMissing, { kind: 'error' });
      return;
    }

    if (compareVersions(androidConfig.version, currentVersion) <= 0) {
      await message(strings.alreadyLatest, { title: strings.promptTitle });
      return;
    }

    const shouldUpdate = await ask(strings.promptBody(androidConfig.version, manifest.notes ?? ''), {
      title: strings.promptTitle,
      okLabel: strings.promptConfirm,
      cancelLabel: strings.promptCancel,
    });

    if (!shouldUpdate) {
      return;
    }

    notifyStatus(onStatus, strings.downloadToast);
    const filePath = await downloadApk(androidConfig.url, `LingoVault_v${androidConfig.version}.apk`);

    notifyStatus(onStatus, strings.installToast);
    try {
      await openInstaller(filePath);
    } catch (installError) {
      const messageText = installError instanceof Error ? installError.message : String(installError);
      await message(strings.installError(messageText), { kind: 'error' });
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    await message(strings.checkError(messageText), { kind: 'error' });
  }
};
