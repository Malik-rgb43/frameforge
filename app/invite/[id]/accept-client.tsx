"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { Btn } from "@/components/ui";
import { createClient } from "@/lib/supabase-client";
import { acceptInvite } from "@/lib/collab-queries";

interface Props {
  projectId: string;
  userEmail: string;
  invitedEmail: string | null;
  emailMatch: boolean;
}

export default function AcceptInviteClient({
  projectId,
  userEmail,
  invitedEmail,
  emailMatch,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "accepting" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (state === "accepting") return;
    setState("accepting");
    setError(null);
    try {
      const supabase = createClient();
      await acceptInvite(supabase, projectId);
      setState("done");
      // Small delay so the user sees the success state, then route home.
      setTimeout(() => router.push("/"), 900);
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not accept the invite. The invite may not match your email."
      );
    }
  }

  if (!emailMatch && invitedEmail) {
    return (
      <div>
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 12,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          This invite was sent to{" "}
          <b style={{ color: "var(--bone)" }}>{invitedEmail}</b>, but you're
          signed in as{" "}
          <b style={{ color: "var(--bone)" }}>{userEmail}</b>. Sign in with
          the invited email to accept.
        </div>
        <Btn
          variant="default"
          size="lg"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.push("/logout")}
        >
          Sign out & switch accounts
        </Btn>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(212,255,58,0.10)",
            color: "var(--lime)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <I.Check size={26} />
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--bone)",
            marginBottom: 4,
          }}
        >
          Invite accepted
        </div>
        <div style={{ fontSize: 12, color: "var(--ash-gray)" }}>
          Redirecting to the project…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ash-gray)",
          lineHeight: 1.5,
          marginBottom: 14,
        }}
      >
        Accepting joins you to the project as a collaborator. You'll see it on
        your home screen immediately.
      </div>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(255,90,95,0.08)",
            border: "1px solid rgba(255,90,95,0.3)",
            borderRadius: 6,
            color: "var(--coral)",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <Btn
        variant="primary"
        size="lg"
        icon={<I.Check size={14} />}
        onClick={handleAccept}
        disabled={state === "accepting"}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {state === "accepting" ? "Accepting…" : "Accept invite"}
      </Btn>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--slate-2)",
          textAlign: "center",
        }}
      >
        Signed in as <b style={{ color: "var(--bone)" }}>{userEmail}</b>
      </div>
    </div>
  );
}
