import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getInviteProject } from "@/lib/collab-queries";
import { shotSVG, svgDataUri, type Kind, type Tone } from "@/lib/data";
import AcceptInviteClient from "./accept-client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function InvitePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const emailFromQuery = (sp.email || "").toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate behind login. Middleware should already handle this for most
  // cases, but belt-and-suspenders — keep the invite id visible in the
  // URL so the user can return after auth.
  if (!user) {
    redirect("/login");
  }

  // Load project summary. If not found, render the "missing" state.
  let project;
  try {
    project = await getInviteProject(supabase, id);
  } catch {
    project = null;
  }

  if (!project) {
    return (
      <InviteShell>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--bone)",
            letterSpacing: -0.3,
            marginBottom: 8,
          }}
        >
          Invite not found
        </div>
        <div style={{ fontSize: 13, color: "var(--ash-gray)", lineHeight: 1.5 }}>
          The project link may have been revoked, or the project has been
          deleted. Ask the owner to send you a new invite.
        </div>
      </InviteShell>
    );
  }

  // Build the hero preview SVG on the server so the page looks styled
  // before any client JS runs.
  const heroSvg = shotSVG({
    kind: (project.hero_kind as Kind) || "bottle",
    tone: (project.hero_tone as Tone) || "amber",
    w: 600,
    h: 320,
  });
  const heroUri = svgDataUri(heroSvg);

  const userEmail = (user.email || "").toLowerCase();
  const emailMatch =
    !!userEmail && (!emailFromQuery || emailFromQuery === userEmail);

  return (
    <InviteShell>
      {/* Hero preview */}
      <div
        style={{
          height: 160,
          borderRadius: 10,
          marginBottom: 18,
          background: `url("${heroUri}") center / cover, var(--ash)`,
          border: "1px solid var(--iron)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 12,
            padding: "3px 8px",
            background: "rgba(10,10,12,0.7)",
            border: "1px solid var(--iron)",
            borderRadius: 4,
            fontSize: 10,
            fontFamily: "var(--f-mono)",
            letterSpacing: 2,
            color: "var(--bone)",
            textTransform: "uppercase",
          }}
        >
          {project.aspect}
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--slate-2)",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          fontFamily: "var(--f-mono)",
          marginBottom: 6,
        }}
      >
        You've been invited
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--bone)",
          letterSpacing: -0.4,
          marginBottom: 6,
        }}
      >
        {project.name}
      </div>
      {project.client && (
        <div
          style={{
            fontSize: 13,
            color: "var(--ash-gray)",
            marginBottom: 18,
          }}
        >
          {project.client}
        </div>
      )}

      <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />

      <AcceptInviteClient
        projectId={project.id}
        userEmail={userEmail}
        invitedEmail={emailFromQuery || null}
        emailMatch={emailMatch}
      />
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--onyx)",
          border: "1px solid var(--iron)",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
          animation: "float-fade 260ms var(--e-out)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
