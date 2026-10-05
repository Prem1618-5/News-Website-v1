import { slugify } from "@/domain/content";
import type { Article, ArticleBlock, HeroMedia, Language, SectionKey, Urgency } from "@/domain/types";
import type { ArticlePatch, NewArticleInput } from "@/domain/workflow";

export interface ComposerDraft {
  kicker: string;
  headline: string;
  standfirst: string;
  section: SectionKey;
  urgency: Urgency;
  sensitivity: boolean;
  language: Language;
  tags: string[];
  hero?: HeroMedia;
  seoTitle: string;
  seoDescription: string;
  slug: string;
}

export function emptyDraft(): ComposerDraft {
  return {
    kicker: "", headline: "", standfirst: "", section: "world", urgency: 3, sensitivity: false, language: "en", tags: [], seoTitle: "", seoDescription: "", slug: "",
  };
}

export function draftFromArticle(a: Article): ComposerDraft {
  return {
    kicker: a.kicker ?? "",
    headline: a.headline,
    standfirst: a.standfirst,
    section: a.section,
    urgency: a.urgency,
    sensitivity: a.sensitivity,
    language: a.language ?? "en",
    tags: a.tags ?? [],
    hero: a.hero,
    seoTitle: a.seo?.title ?? "",
    seoDescription: a.seo?.description ?? "",
    slug: a.slug,
  };
}

/** Only the fields that changed, in the shape the workflow expects. */
export function patchFromDraft(prev: ComposerDraft, next: ComposerDraft): ArticlePatch {
  const patch: ArticlePatch = {};
  const keys = ["kicker", "headline", "standfirst", "section", "urgency", "sensitivity", "language", "tags", "hero", "slug"] as const;
  for (const k of keys) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) (patch as Record<string, unknown>)[k] = next[k];
  }
  if (prev.seoTitle !== next.seoTitle || prev.seoDescription !== next.seoDescription) {
    patch.seo = { title: next.seoTitle || undefined, description: next.seoDescription || undefined };
  }
  return patch;
}

export function inputFromDraft(d: ComposerDraft, body: ArticleBlock[]): NewArticleInput {
  return {
    kicker: d.kicker,
    headline: d.headline,
    standfirst: d.standfirst,
    section: d.section,
    urgency: d.urgency,
    sensitivity: d.sensitivity,
    language: d.language,
    tags: d.tags,
    hero: d.hero,
    body,
    seo: d.seoTitle || d.seoDescription ? { title: d.seoTitle || undefined, description: d.seoDescription || undefined } : undefined,
    slug: d.slug ? slugify(d.slug) : undefined,
  };
}
