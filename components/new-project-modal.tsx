"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { Btn, Field, Input, iconBtnStyle } from "./ui";
import { ASPECTS, type Aspect } from "@/lib/data";

export default function NewProjectModal({
  open,
  onClose,
  onCreate,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; client: string; aspect: Aspect }) => void | Promise<void>;
  busy?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [mode, setMode] = useState("upload");

  if (!open) return null;

  const canContinue = name.trim().length > 0;

  function handleSubmit() {
    if (busy) return;
    const safeName = name.trim() || "Untitled project";
    onCreate({ name: safeName, client: client.trim(), aspect });
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        animation: "float-fade 200ms var(--e-out)",
      }}
    >
      <div
        style={{
          width: 640,
          background: "var(--onyx)",
          border: "1px solid var(--iron-2)",
          borderRadius: 14,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--iron)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bone)" }}>New project</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: "var(--slate-2)", fontFamily: "var(--f-mono)" }}>
            STEP {step + 1} / 2
          </div>
          <button onClick={onClose} style={{ ...iconBtnStyle(), marginLeft: 10 }}>
            <I.X size={14} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {step === 0 ? (
            <>
              <Field label="Project name">
                <Input value={name} onChange={setName} placeholder="e.g. AURA — Morning Campaign" />
              </Field>
              <Field label="Client / brand">
                <Input value={client} onChange={setClient} placeholder="Aura Skincare" />
              </Field>
              <Field label="Aspect ratio" hint="You can override this per shot later.">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {ASPECTS.map((a) => {
                    const sel = a.id === aspect;
                    const mh = 48;
                    const aw = a.w / a.h > 1 ? mh * (a.w / a.h) : mh * 0.7;
                    const ah = a.w / a.h > 1 ? mh * 0.7 : mh;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setAspect(a.id)}
                        style={{
                          height: 96,
                          background: sel ? "rgba(212,255,58,0.06)" : "var(--ash)",
                          border: `1px solid ${sel ? "rgba(212,255,58,0.35)" : "var(--iron)"}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: aw,
                            height: ah,
                            border: `1.5px solid ${sel ? "var(--lime)" : "var(--slate)"}`,
                            borderRadius: 2,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            color: sel ? "var(--lime)" : "var(--bone)",
                            fontWeight: 600,
                            fontFamily: "var(--f-mono)",
                          }}
                        >
                          {a.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--ash-gray)", marginBottom: 14 }}>
                Give FrameForge something to work with.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "upload",   icon: <I.Upload size={20} />,   title: "Upload product photos", sub: "3–10 images · auto-tagged" },
                  { id: "prompt",   icon: <I.Sparkles size={20} />, title: "Describe it",            sub: "AI generates references" },
                  { id: "import",   icon: <I.Link size={20} />,     title: "Import from URL",        sub: "Shopify · Amazon · image URL" },
                  { id: "template", icon: <I.Grid size={20} />,     title: "Use a template",         sub: "Skincare · Apparel · Food" },
                ].map((m) => {
                  const sel = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      style={{
                        padding: 16,
                        textAlign: "left",
                        background: sel ? "rgba(212,255,58,0.06)" : "var(--ash)",
                        border: `1px solid ${sel ? "rgba(212,255,58,0.35)" : "var(--iron)"}`,
                        borderRadius: 8,
                        cursor: "pointer",
                        color: sel ? "var(--lime)" : "var(--bone)",
                      }}
                    >
                      {m.icon}
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 3, fontWeight: 400 }}>
                        {m.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              {mode === "upload" && (
                <div
                  style={{
                    marginTop: 14,
                    height: 120,
                    border: "1px dashed var(--iron-2)",
                    borderRadius: 10,
                    background: "var(--ash)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--slate-2)",
                    fontSize: 12,
                    gap: 6,
                  }}
                >
                  <I.Upload size={22} />
                  <div>
                    Drop images here, or{" "}
                    <span style={{ color: "var(--lime)", textDecoration: "underline" }}>browse</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--slate)", fontFamily: "var(--f-mono)" }}>
                    PNG · JPG · WebP · up to 20MB
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--iron)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--slate-2)" }}>
            {step === 0 ? "Basic info" : "Starting point"}
          </div>
          <div style={{ flex: 1 }} />
          {step === 1 && (
            <Btn variant="ghost" onClick={() => setStep(0)}>
              Back
            </Btn>
          )}
          <Btn
            variant="primary"
            icon={step === 0 ? <I.ArrowRight size={14} /> : <I.Sparkles size={14} />}
            onClick={() => (step === 0 ? setStep(1) : handleSubmit())}
            disabled={step === 0 ? !canContinue : busy}
            style={{ marginLeft: 8 }}
          >
            {step === 0 ? "Continue" : busy ? "Creating…" : "Create project"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
