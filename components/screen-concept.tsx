"use client";
import React, { useState } from "react";
import { I } from "./icons";
import { Btn, Chip, Field, Input, Textarea } from "./ui";
import { SEED_CONCEPTS, SEED_PRODUCT_IMAGES, shotURI, type Concept } from "@/lib/data";

export default function ScreenConcept({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState("c1");
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left — brief */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          borderRight: "1px solid var(--iron)",
          padding: 22,
          overflow: "auto",
          background: "var(--onyx)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--f-mono)",
            letterSpacing: 1.5,
            color: "var(--slate-2)",
            marginBottom: 4,
          }}
        >
          BRIEF
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--bone)",
            marginBottom: 14,
            letterSpacing: -0.2,
          }}
        >
          AURA \u00B7 Morning Campaign
        </div>
        <Field label="Goal">
          <Textarea rows={3} value="Launch of AURA's signature serum. Reposition as a quiet luxury ritual, not skincare." />
        </Field>
        <Field label="Audience">
          <Input value="Women, 28–44, premium beauty, urban" />
        </Field>
        <Field label="Placements">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Chip color="lime">Reels</Chip>
            <Chip color="lime">TikTok</Chip>
            <Chip>YouTube pre-roll</Chip>
            <Chip>OOH</Chip>
          </div>
        </Field>
        <Field label="Must include">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {["Logo visible 2+ seconds", "Product close-up", "End card with CTA"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--ash-gray)",
                }}
              >
                <I.Check size={12} style={{ color: "var(--lime)" }} /> {t}
              </div>
            ))}
          </div>
        </Field>
        <div style={{ height: 1, background: "var(--iron)", margin: "18px 0" }} />
        <div
          style={{
            fontSize: 11,
            color: "var(--slate-2)",
            marginBottom: 8,
            fontFamily: "var(--f-mono)",
            letterSpacing: 1,
          }}
        >
          REFERENCES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {SEED_PRODUCT_IMAGES.filter((i) => i.isRef)
            .slice(0, 3)
            .map((i) => (
              <div
                key={i.id}
                style={{
                  aspectRatio: "1",
                  background: `url("${shotURI({ id: i.id, kind: i.kind, tone: i.tone, w: 300, h: 300 })}") center/cover`,
                  border: "1px solid var(--iron)",
                  borderRadius: 6,
                }}
              />
            ))}
        </div>
      </div>

      {/* Right — concepts */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--f-mono)",
              letterSpacing: 1.5,
              color: "var(--lime)",
            }}
          >
            STEP 2 \u00B7 PICK A DIRECTION
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--bone)", letterSpacing: -0.4 }}>
            Five concepts from your brief
          </div>
          <div style={{ flex: 1 }} />
          <Btn size="sm" icon={<I.Refresh size={14} />}>Regenerate</Btn>
          <Btn
            size="sm"
            variant="primary"
            icon={<I.ArrowRight size={14} />}
            onClick={onNext}
            style={{ marginLeft: 8 }}
          >
            Use this concept
          </Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {SEED_CONCEPTS.map((c, i) => (
            <ConceptCard
              key={c.id}
              c={c}
              idx={i}
              selected={selected === c.id}
              onClick={() => setSelected(c.id)}
            />
          ))}
          <div
            style={{
              padding: 20,
              border: "1px dashed var(--iron-2)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 260,
              cursor: "pointer",
            }}
          >
            <div style={{ color: "var(--lime)" }}>
              <I.Edit size={22} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bone)" }}>Write your own</div>
            <div style={{ fontSize: 11, color: "var(--slate-2)", textAlign: "center" }}>
              Paste a storyboard, moodboard,
              <br />
              or reference link.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceptCard({
  c,
  selected,
  onClick,
  idx,
}: {
  c: Concept;
  selected: boolean;
  onClick: () => void;
  idx: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 18,
        background: selected
          ? "linear-gradient(160deg, rgba(212,255,58,0.06), transparent 70%), var(--onyx)"
          : "var(--onyx)",
        border: `1px solid ${selected ? "rgba(212,255,58,0.4)" : "var(--iron)"}`,
        borderRadius: 12,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 200ms var(--e-out)",
        animation: `stagger-in 300ms ${idx * 60}ms var(--e-out) both`,
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--lime)",
            color: "var(--lime-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.Check size={14} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 0,
          height: 6,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 12,
          width: "fit-content",
        }}
      >
        {c.palette.map((p, i) => (
          <div key={i} style={{ width: 36, height: 6, background: p }} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--f-mono)",
          letterSpacing: 1.5,
          color: "var(--slate-2)",
          marginBottom: 4,
        }}
      >
        CONCEPT \u00B7 {String(idx + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 600,
          color: "var(--bone)",
          letterSpacing: -0.3,
          marginBottom: 8,
        }}
      >
        {c.title}
      </div>
      <div style={{ fontSize: 13, color: "var(--ash-gray)", lineHeight: 1.55, marginBottom: 14 }}>{c.hook}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {c.vibe.map((v) => (
          <Chip key={v}>{v}</Chip>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: "var(--slate-2)",
          fontFamily: "var(--f-mono)",
        }}
      >
        <span>
          <I.Clock size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
          {c.length}s
        </span>
        <span>
          <I.Film size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
          {c.shots} shots
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: selected ? "var(--lime)" : "var(--slate-2)" }}>
          {selected ? "Selected" : "Tap to select"}
        </span>
      </div>
    </div>
  );
}
