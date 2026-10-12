"use client";

import { useAuth } from "@/hooks/useAuth";

// Guest-facing hero copy ("sign in for details") — rendered only for guests.
// Users (and the loading state, to avoid a flash) see nothing.
export default function HeroTagline() {
  const { status } = useAuth();
  if (status !== "guest") return null;
  return (
    <p className="mt-1 text-sm text-text-subdued">
      Everyday goods, one path — browse the catalog, sign in for details.
    </p>
  );
}
