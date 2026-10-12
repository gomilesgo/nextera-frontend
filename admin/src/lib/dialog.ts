export type NativeSync = "show" | "close" | null;

export function syncNative(open: boolean, nativeOpen: boolean): NativeSync {
  if (open && !nativeOpen) return "show";
  if (!open && nativeOpen) return "close";
  return null;
}

export function cancelBlocked(dismissible: boolean): boolean {
  return !dismissible;
}

export type NativeClose = { notify: boolean; resync: boolean };

export function nativeClosed(open: boolean, dismissible: boolean): NativeClose {
  return { notify: open && dismissible, resync: open };
}

export function backdropDismiss(pressedBackdrop: boolean, clickedBackdrop: boolean, dismissible: boolean): boolean {
  return dismissible && pressedBackdrop && clickedBackdrop;
}
