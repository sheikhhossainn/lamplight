import { useSyncExternalStore } from 'react';
import { getSetting, setSetting, deleteSetting } from '@/db/repositories/appSettings';

export interface PresetAvatar {
  id: string;
  label: string;
  description: string;
  backgroundColor: string;
  accentColor: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'flame',
    label: 'The Lamplight',
    description: 'Warm lantern guiding through literature',
    backgroundColor: '#2B1A04',
    accentColor: '#F5A623',
  },
  {
    id: 'owl',
    label: 'Night Owl',
    description: 'Silent wisdom in the midnight hours',
    backgroundColor: '#15241B',
    accentColor: '#7FA37A',
  },
  {
    id: 'scholar',
    label: 'The Scholar',
    description: 'Parchment scrolls and enduring knowledge',
    backgroundColor: '#102230',
    accentColor: '#5B93B8',
  },
  {
    id: 'quill',
    label: 'The Chronicler',
    description: 'Ink, marginalia, and recorded thoughts',
    backgroundColor: '#26162B',
    accentColor: '#A86FB0',
  },
  {
    id: 'coffee',
    label: 'Quiet Cafe',
    description: 'Steaming cup and a slow afternoon chapter',
    backgroundColor: '#28190B',
    accentColor: '#D4883B',
  },
  {
    id: 'moon',
    label: 'The Dreamer',
    description: 'Quiet contemplation under starlight',
    backgroundColor: '#171B2B',
    accentColor: '#7D90BA',
  },
  {
    id: 'wanderer',
    label: 'The Pathfinder',
    description: 'Wandering through epic sagas and poetry',
    backgroundColor: '#291811',
    accentColor: '#BA6E4F',
  },
  {
    id: 'sanctuary',
    label: 'The Sanctuary',
    description: 'Deep botanical green and restorative solace',
    backgroundColor: '#11241F',
    accentColor: '#609E8C',
  },
];

export const SETTING_USER_AVATAR = 'user_avatar_url';

export function getPresetAvatar(idOrKey: string | null | undefined): PresetAvatar | null {
  if (!idOrKey) return null;
  const cleanId = idOrKey.startsWith('preset:') ? idOrKey.slice(7) : idOrKey;
  return PRESET_AVATARS.find((p) => p.id === cleanId) ?? null;
}

export function isPresetAvatarKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return key.startsWith('preset:') || PRESET_AVATARS.some((p) => p.id === key);
}

export function isRemoteImageUrl(key: string | null | undefined): boolean {
  if (!key) return false;
  return key.startsWith('http://') || key.startsWith('https://');
}

export interface UserAvatarState {
  avatar: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
}

let currentState: UserAvatarState = {
  avatar: null,
  isAuthenticated: false,
  hydrated: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getUserAvatarSync(): UserAvatarState {
  return currentState;
}

export async function getUserAvatar(): Promise<string | null> {
  await hydrateUserAvatar();
  return currentState.avatar;
}

async function checkAuth(): Promise<boolean> {
  try {
    const { isAuthenticatedAccount } = await import('@/lib/supabaseAuth');
    return await isAuthenticatedAccount();
  } catch {
    return false;
  }
}

export async function setUserAvatar(avatar: string | null): Promise<void> {
  const normalized = avatar ? (isPresetAvatarKey(avatar) && !avatar.startsWith('preset:') ? `preset:${avatar}` : avatar) : null;
  
  if (normalized) {
    await setSetting(SETTING_USER_AVATAR, normalized);
  } else {
    await deleteSetting(SETTING_USER_AVATAR);
  }

  const isAuth = await checkAuth();
  currentState = {
    avatar: normalized,
    isAuthenticated: isAuth,
    hydrated: true,
  };
  emit();
}

export async function refreshUserAvatar(): Promise<void> {
  const [saved, isAuth] = await Promise.all([
    getSetting(SETTING_USER_AVATAR).catch(() => null),
    checkAuth(),
  ]);

  let avatarValue = saved ?? null;
  if (!avatarValue && isAuth) {
    try {
      const { getUserProfile } = await import('@/lib/supabaseAuth');
      const profile = await getUserProfile();
      if (profile.avatarUrl) {
        avatarValue = profile.avatarUrl;
        await setSetting(SETTING_USER_AVATAR, avatarValue).catch(() => {});
      }
    } catch {}
  }

  currentState = {
    avatar: avatarValue,
    isAuthenticated: isAuth,
    hydrated: true,
  };
  emit();
}

export async function hydrateUserAvatar(): Promise<void> {
  if (currentState.hydrated) return;
  await refreshUserAvatar();
}

// Auto-hydrate on initial module evaluation in React Native runtime
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  void refreshUserAvatar().catch(() => {});
}

export function useUserAvatar(): {
  avatar: string | null;
  preset: PresetAvatar | null;
  isGoogle: boolean;
  isPreset: boolean;
  isAuthenticated: boolean;
  hydrated: boolean;
} {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getUserAvatarSync,
  );

  const preset = getPresetAvatar(state.avatar);
  const isGoogle = isRemoteImageUrl(state.avatar);
  const isPreset = Boolean(preset);

  return {
    avatar: state.avatar,
    preset,
    isGoogle,
    isPreset,
    isAuthenticated: state.isAuthenticated,
    hydrated: state.hydrated,
  };
}
