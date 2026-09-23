"use client";

import { useClientStore } from "@/lib/client-store";
import { getPlace } from "@/lib/world";

export function InteractHint() {
  const nearPlaceId = useClientStore((s) => s.nearPlaceId);
  const place = nearPlaceId ? getPlace(nearPlaceId) : undefined;
  if (!place) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground/85 px-4 py-1.5 text-sm text-background shadow">
      <kbd className="mr-1.5 rounded bg-background/20 px-1.5 font-mono">E</kbd>
      войти: {place.name}
    </div>
  );
}
