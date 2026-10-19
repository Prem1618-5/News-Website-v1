/**
 * Cleans HTML pasted from Microsoft Word, Google Docs and web pages before the editor parses it, so a
 * story pasted in one go comes out in the house style: real headings, lists, bold and italic, links,
 * nothing else. Fonts, sizes, colours and alignment from the source are dropped on purpose.
 *
 * Photos inside pasted text are removed (third-party images are never hotlinked); `onImagesDropped`
 * tells the writer so they can add their own.
 */

const KEEP_STYLE_TAGS: [RegExp, string][] = [
  [/font-weight\s*:\s*(bold|[6-9]00)/i, "strong"],
  [/font-style\s*:\s*italic/i, "em"],
  [/text-decoration[^;]*underline/i, "u"],
  [/text-decoration[^;]*line-through/i, "s"],
  [/vertical-align\s*:\s*super/i, "sup"],
  [/vertical-align\s*:\s*sub/i, "sub"],
];

function unwrap(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function wrapChildren(el: Element, tag: string) {
  const w = el.ownerDocument.createElement(tag);
  while (el.firstChild) w.appendChild(el.firstChild);
  el.appendChild(w);
}

function rename(el: Element, tag: string): Element {
  const next = el.ownerDocument.createElement(tag);
  while (el.firstChild) next.appendChild(el.firstChild);
  el.replaceWith(next);
  return next;
}

/** Word's lists are paragraphs with a fake bullet; turn runs of them into real lists. */
function fixWordLists(doc: Document) {
  const items = Array.from(doc.querySelectorAll("p")).filter(
    (p) => /MsoList/i.test(p.className) || /mso-list\s*:/i.test(p.getAttribute("style") ?? ""),
  );
  let list: Element | null = null;
  for (const p of items) {
    const marker = p.querySelector('[style*="mso-list"]');
    const markerText = (marker?.textContent ?? "").trim();
    marker?.remove();
    const ordered = /^\(?[0-9a-z]{1,3}[.)]/i.test(markerText);
    // Consecutive list paragraphs of the same kind join the list just before them.
    if (!list || p.previousElementSibling !== list || (list.tagName === "OL") !== ordered) {
      list = doc.createElement(ordered ? "ol" : "ul");
      p.before(list);
    }
    const li = doc.createElement("li");
    while (p.firstChild) li.appendChild(p.firstChild);
    list.appendChild(li);
    p.remove();
  }
}

export function cleanPastedHtml(html: string, onImagesDropped?: (n: number) => void): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;

  // Comments, Word's conditional blocks, scripts, styles, metadata.
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.parentNode?.removeChild(c));
  body.querySelectorAll("script,style,meta,link,title,xml,iframe,object,embed,form,input,button,select,textarea,svg,canvas,video,audio,source,picture").forEach((n) => n.remove());

  const images = body.querySelectorAll("img");
  if (images.length) onImagesDropped?.(images.length);
  images.forEach((n) => n.remove());

  // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-...">.
  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap);
  body.querySelectorAll("o\\:p").forEach((n) => n.remove());

  fixWordLists(doc);

  // Inline styles that carry meaning become tags; the rest of the style is thrown away.
  body.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    if (/font-weight\s*:\s*(normal|[1-4]00)/i.test(style) && (el.tagName === "B" || el.tagName === "STRONG")) {
      unwrap(el);
      return;
    }
    if (el.tagName === "SPAN") for (const [re, tag] of KEEP_STYLE_TAGS) if (re.test(style)) wrapChildren(el, tag);
    el.removeAttribute("style");
  });

  // Heading levels: the story has one headline, so pasted h1 becomes a section heading.
  body.querySelectorAll("h1").forEach((h) => rename(h, "h2"));
  body.querySelectorAll("h4,h5,h6").forEach((h) => rename(h, "h3"));
  // Word "Title" / "Heading" paragraph classes.
  body.querySelectorAll("p").forEach((p) => {
    if (/MsoTitle|MsoHeading1|Heading1/i.test(p.className)) rename(p, "h2");
    else if (/MsoHeading[2-6]|MsoSubtitle|Heading[2-6]/i.test(p.className)) rename(p, "h3");
  });

  // Links: only web, mail and site links survive; Word's internal bookmarks go.
  body.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (!/^(https?:\/\/|mailto:)/i.test(href)) unwrap(a);
    else for (const attr of Array.from(a.attributes)) if (attr.name !== "href") a.removeAttribute(attr.name);
  });

  // Fonts, spans and classes add nothing once their meaning has been read.
  body.querySelectorAll("font,span").forEach(unwrap);
  body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) if (!["href", "colspan", "rowspan"].includes(attr.name)) el.removeAttribute(attr.name);
  });

  // Empty paragraphs Word uses for spacing.
  body.querySelectorAll("p").forEach((p) => {
    if (!p.textContent?.replace(/ /g, " ").trim() && !p.querySelector("br")) p.remove();
  });
  return body.innerHTML.replace(/ /g, " ");
}
