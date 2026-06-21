import { Eye, ShieldCheck, UserRound } from "lucide-react";
import type { Role } from "../lib/jobFlow";

/**
 * Tells the connected user, in plain language, who they are on this job and what
 * is happening right now — the answer to "should I be the one clicking buttons?".
 */
export function RoleBanner({ role, headline, situation }: { role: Role; headline: string; situation: string }) {
  const Icon = role === "client" ? UserRound : role === "agent" ? ShieldCheck : Eye;
  return (
    <div className={`role-banner role-${role}`}>
      <Icon size={20} />
      <div>
        <strong>{headline}</strong>
        {situation && <p>{situation}</p>}
      </div>
    </div>
  );
}
