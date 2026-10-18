import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

let key = "";
let current: string | null = null;
let generation = 0;
let pending = Promise.resolve();
const valid = (value: string | null) =>
  value && /^[a-f\d]{32}$/i.test(value) ? value : null;

export async function configureConversationLocation(
  origin: string,
  owner: string,
) {
  const version = ++generation;
  key = `xinxin-agent:${encodeURIComponent(JSON.stringify([origin.replace(/\/+$/, ""), owner]))}`;
  const selectedKey = key;
  try {
    current = valid(localStorage.getItem(key));
  } catch {
    current = null;
  }
  if (Capacitor.isNativePlatform()) {
    await pending;
    const stored = await Preferences.get({ key: selectedKey }).catch(
      () => null,
    );
    if (version === generation && stored) current = valid(stored.value);
  }
}

export const rememberedConversation = () => current;

export function rememberConversation(id: string | null) {
  if (!key || (id !== null && !valid(id))) return;
  current = id;
  const selectedKey = key;
  try {
    if (id) localStorage.setItem(selectedKey, id);
    else localStorage.removeItem(selectedKey);
  } catch {
    /* Navigation still works when storage is unavailable. */
  }
  if (Capacitor.isNativePlatform()) {
    pending = pending
      .then(() =>
        id
          ? Preferences.set({ key: selectedKey, value: id })
          : Preferences.remove({ key: selectedKey }),
      )
      .catch(() => {});
  }
}

export function forgetConversation(id: string) {
  if (current === id) rememberConversation(null);
}
