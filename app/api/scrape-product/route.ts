// Scrape a product URL and extract brief fields using Gemini.
// Called from the Brief panel when the user pastes a product page link.

import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/ai/gemini";

export const maxDuration = 30;

interface ScrapedBrief {
  productName?: string;
  productCategory?: string;
  productDescription?: string;
  brandVoice?: string;
  brandValues?: string[];
  productReviews?: string;
  competitors?: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page HTML (plain text, stripped)
    let pageText = "";
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await res.text();
      // Strip HTML tags, collapse whitespace — Gemini needs text not markup
      pageText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 12_000); // Cap at 12k chars to fit context
    } catch (err) {
      return NextResponse.json(
        { error: `Could not fetch URL: ${err instanceof Error ? err.message : "network error"}` },
        { status: 422 }
      );
    }

    if (!pageText) {
      return NextResponse.json({ error: "Empty page content" }, { status: 422 });
    }

    // Ask Gemini to extract structured product info
    const result = await callGemini<ScrapedBrief>(
      `You are a marketing analyst extracting product information from an e-commerce or brand page.
Extract ONLY factual information present on the page — do NOT invent or assume.
Return JSON matching this schema exactly:
{
  "productName": "brand + product name",
  "productCategory": "category, e.g. skincare / RTD coffee / SaaS",
  "productDescription": "1-3 sentences: what it is, what makes it unique, main benefit",
  "brandVoice": "3-5 adjectives describing the brand tone from the page copy",
  "brandValues": ["value1","value2","value3"],
  "productReviews": "paste 3-5 real review snippets verbatim if visible on the page, else empty string",
  "competitors": []
}
If a field is not determinable from the page, use an empty string or empty array. JSON only, no prose.`,
      `Extract product information from this page content:\n\n${pageText}`,
      { model: "gemini-3-flash", responseMimeType: "application/json" }
    );

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("scrape-product error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "extraction failed" },
      { status: 500 }
    );
  }
}
