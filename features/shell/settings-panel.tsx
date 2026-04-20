"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Globe, Users, Sparkles, AlertTriangle, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, useLang } from "@/lib/i18n/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const t = useI18n((s) => s.t);
  const [lang, setLang] = useLang();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">(
    "editor"
  );
  const [invited, setInvited] = useState(false);

  const sendInvite = async () => {
    if (!inviteEmail.includes("@")) return;
    // TODO: Phase 7 wires to Supabase `invites` table
    setInvited(true);
    setTimeout(() => {
      setInvited(false);
      setInviteEmail("");
    }, 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 w-[min(90vw,440px)] glass-panel border-l border-border-subtle shadow-panel z-50 flex flex-col"
          >
            <header className="h-14 px-5 flex items-center gap-3 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-text-primary flex-1">
                {t("settings.title")}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {/* General */}
              <Section icon={Globe} label={t("settings.section.general")}>
                <Row label={t("settings.language")} sub={t("settings.language.sub")}>
                  <LangToggle value={lang} onChange={setLang} />
                </Row>
              </Section>

              {/* Team */}
              <Section icon={Users} label={t("settings.section.team")}>
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-text-secondary">
                    {t("settings.team.invite")}
                  </div>
                  <div className="text-2xs text-text-muted">
                    {t("settings.team.inviteHint")}
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Mail className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-text-muted" />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder={t("settings.team.emailPlaceholder")}
                          dir="ltr"
                          className="w-full h-9 bg-canvas border border-border-subtle rounded-lg ps-9 pe-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-warm/40 focus:border-accent-warm/30"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as typeof inviteRole)
                        }
                        className="h-9 bg-canvas border border-border-subtle rounded-lg px-2 text-xs text-text-primary focus:outline-none"
                      >
                        <option value="admin">{t("settings.team.role.admin")}</option>
                        <option value="editor">{t("settings.team.role.editor")}</option>
                        <option value="viewer">{t("settings.team.role.viewer")}</option>
                      </select>
                    </div>
                    <button
                      onClick={sendInvite}
                      disabled={!inviteEmail.includes("@") || invited}
                      className={cn(
                        "h-9 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ease-spring",
                        invited
                          ? "bg-status-success text-canvas"
                          : inviteEmail.includes("@")
                            ? "bg-accent-warm text-canvas hover:brightness-110"
                            : "bg-white/5 text-text-muted cursor-not-allowed"
                      )}
                    >
                      {invited ? (
                        <>
                          <Check className="w-4 h-4" /> Sent
                        </>
                      ) : (
                        t("settings.team.sendInvite")
                      )}
                    </button>
                  </div>
                </div>
              </Section>

              {/* AI */}
              <Section icon={Sparkles} label={t("settings.section.ai")}>
                <Row label={t("settings.ai.imageModel")}>
                  <select className="h-8 bg-canvas border border-border-subtle rounded-md px-2 text-xs text-text-primary">
                    <option>NanoBanana Pro (Gemini 3 Pro Image)</option>
                    <option>NanoBanana 3.1 Flash</option>
                    <option>Flash (drafts)</option>
                  </select>
                </Row>
                <Row label={t("settings.ai.textModel")}>
                  <select className="h-8 bg-canvas border border-border-subtle rounded-md px-2 text-xs text-text-primary">
                    <option>Gemini 3 Pro</option>
                    <option>Gemini 3 Flash</option>
                  </select>
                </Row>
              </Section>

              {/* Danger */}
              <Section icon={AlertTriangle} label={t("settings.section.danger")} danger>
                <button className="h-9 px-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs font-medium hover:bg-status-error/20 transition-colors">
                  {t("settings.danger.deleteProject")}
                </button>
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon: Icon,
  label,
  danger,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div
        className={cn(
          "flex items-center gap-2 text-2xs font-mono uppercase tracking-wider",
          danger ? "text-status-error" : "text-text-muted"
        )}
      >
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm text-text-primary">{label}</div>
        {sub && <div className="text-2xs text-text-muted mt-0.5">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function LangToggle({
  value,
  onChange,
}: {
  value: "en" | "he";
  onChange: (l: "en" | "he") => void;
}) {
  return (
    <div className="inline-flex h-8 rounded-lg bg-canvas p-0.5 border border-border-subtle">
      {(["en", "he"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            "h-full px-3 rounded-md text-xs font-medium transition-all ease-spring duration-200",
            value === l
              ? "bg-panel-2 text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {l === "en" ? "English" : "עברית"}
        </button>
      ))}
    </div>
  );
}
