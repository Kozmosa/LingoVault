declare const __APP_VERSION__: string | undefined;

const FALLBACK_VERSION = '0.0.0';

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__
    ? __APP_VERSION__
    : FALLBACK_VERSION;

export const getAppVersion = (): string => APP_VERSION;
