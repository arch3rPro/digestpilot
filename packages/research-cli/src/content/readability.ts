import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ReadableContent {
  title: string;
  byline: string;
  siteName: string;
  excerpt: string;
  textContent: string;
  contentLength: number;
}

export function extractReadableContent(html: string, url: string): ReadableContent {
  const dom = new JSDOM(html, { url });
  try {
    const heading = normalizeText(dom.window.document.querySelector("article h1, main h1, h1")?.textContent || "");
    const article = new Readability(dom.window.document).parse();
    const readableText = normalizeText(article?.textContent || "");
    const fallbackText = normalizeText(
      dom.window.document.querySelector("article, main")?.textContent || dom.window.document.body?.textContent || ""
    );
    const textContent = readableText.length >= 80 || readableText.length >= fallbackText.length ? readableText : fallbackText;
    const title = heading || normalizeText(article?.title || "");
    const parsedExcerpt = normalizeText(article?.excerpt || "");
    const excerpt = clip(parsedExcerpt.length >= 80 ? parsedExcerpt : firstSentenceBlock(textContent), 600);

    return {
      title,
      byline: normalizeText(article?.byline || ""),
      siteName: normalizeText(article?.siteName || ""),
      excerpt,
      textContent,
      contentLength: textContent.length
    };
  } finally {
    dom.window.close();
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstSentenceBlock(value: string): string {
  if (!value) return "";
  const sentence = /^(.{80,}?[.!?])\s/.exec(value);
  return sentence?.[1] ?? value;
}

function clip(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}
