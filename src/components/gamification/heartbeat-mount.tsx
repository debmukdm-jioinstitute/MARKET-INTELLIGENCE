"use client";

import { useEngagementHeartbeat } from "@/lib/gamification/client";

/**
 * Mounts the engagement heartbeat (1 ping on mount, then every 60s while the
 * tab is visible, signed-in non-guest users only). Renders nothing.
 */
export function HeartbeatMount() {
  useEngagementHeartbeat();
  return null;
}
