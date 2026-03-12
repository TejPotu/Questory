import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMediaUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith('/static')) {
      return `http://localhost:8000${url}`;
  }
  return url;
}
