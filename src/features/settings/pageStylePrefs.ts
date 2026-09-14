import { useSyncExternalStore } from 'react';
import { getSetting, setSetting } from '@/db/repositories/appSettings';
import type { PageStyleId } from '@/features/reader/pageStyles';

const PAGE_STYLE_KEY = 'reader_page_style';

let currentPageStyle: PageStyleId = 'manuscript';
const listeners = new Set<() => void>();

export function getPageStyle(): PageStyleId {
  return currentPageStyle;
}

export function setPageStyle(style: PageStyleId): void {
  if (style === currentPageStyle) return;
  currentPageStyle = style;
  listeners.forEach((listener) => listener());
  void setSetting(PAGE_STYLE_KEY, style);
}

export async function hydratePageStyle(): Promise<void> {
  const saved = await getSetting(PAGE_STYLE_KEY);
  if (saved && (saved === 'manuscript' || saved === 'classic' || saved === 'modern')) {
    currentPageStyle = saved;
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePageStyle(): PageStyleId {
  return useSyncExternalStore(subscribe, getPageStyle);
}
