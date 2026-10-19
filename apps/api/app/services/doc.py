"""Story bodies.

The Newsroom editor (TipTap / ProseMirror) saves a JSON document. Before anything is stored it goes
through `clean_doc`, an allow-list of node types, marks and attributes: unknown content is dropped, links
must be http(s), mailto or site-relative, and media must be files this site serves (/media/, /images/), so
third-party photos are never hotlinked. Draft documents keep `note` marks (review highlights).

On publish `to_blocks` turns the document into the Reader's block format (the same one the article packs
use), dropping review notes. HTML is never stored or rendered anywhere.

Reader block format:
    {"id", "type", "props", "content": [inline], "children": [block]}
    inline: {"type": "text", "text", "styles": {bold, italic, underline, strike, code, highlight, textColor, sup, sub}}
            {"type": "link", "href", "content": [text inline]}
    types:  paragraph, heading(level 2|3), quote, pullquote(cite), bulletListItem, numberedListItem, divider,
            image|video|audio(url, posterUrl, caption, credit, alt), table(content: {"type": "tableContent",
            "rows": [{"cells": [[inline]]}]}, props.header), factbox(title, children)
"""
from __future__ import annotations

import json
import re
from typing import Any

MAX_DOC_BYTES = 400_000
MAX_DEPTH = 12

# Text colours and highlight tints are tokens, never raw CSS: the Reader maps them to its own palette.
COLORS = frozenset({"red", "orange", "green", "blue", "purple", "gray"})
HIGHLIGHTS = frozenset({"yellow", "green", "blue", "pink"})
ALIGN = frozenset({"left", "center", "right", "justify"})
NOTE_KINDS = frozenset({"problem", "suggestion", "comment"})

BLOCK_NODES = frozenset({
    "paragraph", "heading", "blockquote", "pullQuote", "bulletList", "orderedList", "listItem", "horizontalRule",
    "image", "video", "audio", "table", "tableRow", "tableHeader", "tableCell", "factBox",
})
INLINE_NODES = frozenset({"text", "hardBreak"})
MARKS = frozenset({"bold", "italic", "underline", "strike", "code", "link", "highlight", "textStyle", "subscript", "superscript", "note"})

LINK_OK = re.compile(r"^(https?://|mailto:|/)", re.I)
MEDIA_OK = re.compile(r"^/(media|images)/[\w./-]+$")


def safe_link(href: object) -> str:
    url = str(href or "").strip()
    return url[:2000] if LINK_OK.match(url) and not url.startswith("//") else ""


def safe_media(src: object) -> str:
    url = str(src or "").strip()
    return url if MEDIA_OK.match(url) and ".." not in url else ""


def _text(value: object, limit: int = 2000) -> str:
    return str(value or "")[:limit]


def _clean_marks(marks: list | None, keep_notes: bool) -> list[dict]:
    out: list[dict] = []
    for m in marks or []:
        if not isinstance(m, dict) or m.get("type") not in MARKS:
            continue
        kind, attrs = m["type"], m.get("attrs") or {}
        if kind == "link":
            href = safe_link(attrs.get("href"))
            if href:
                out.append({"type": "link", "attrs": {"href": href}})
        elif kind == "highlight":
            color = attrs.get("color") if attrs.get("color") in HIGHLIGHTS else "yellow"
            out.append({"type": "highlight", "attrs": {"color": color}})
        elif kind == "textStyle":
            if attrs.get("color") in COLORS:
                out.append({"type": "textStyle", "attrs": {"color": attrs["color"]}})
        elif kind == "note":
            if keep_notes and attrs.get("kind") in NOTE_KINDS and re.fullmatch(r"[\w-]{4,40}", str(attrs.get("id", ""))):
                out.append({"type": "note", "attrs": {"id": attrs["id"], "kind": attrs["kind"]}})
        else:
            out.append({"type": kind})
    return out


def _clean_attrs(kind: str, attrs: dict) -> dict:
    if kind in ("paragraph", "heading"):
        out: dict[str, Any] = {}
        if attrs.get("textAlign") in ALIGN and attrs["textAlign"] != "left":
            out["textAlign"] = attrs["textAlign"]
        if kind == "heading":
            out["level"] = 3 if attrs.get("level") == 3 else 2
        return out
    if kind in ("image", "video", "audio"):
        return {
            "src": safe_media(attrs.get("src")),
            "poster": safe_media(attrs.get("poster")) if kind == "video" else "",
            "alt": _text(attrs.get("alt"), 300),
            "caption": _text(attrs.get("caption"), 400),
            "credit": _text(attrs.get("credit"), 200),
        }
    if kind == "pullQuote":
        return {"cite": _text(attrs.get("cite"), 200)}
    if kind == "factBox":
        return {"title": _text(attrs.get("title"), 120)}
    if kind == "orderedList":
        start = attrs.get("start")
        return {"start": start} if isinstance(start, int) and 1 < start < 10_000 else {}
    return {}


def _clean_node(node: object, keep_notes: bool, depth: int) -> dict | None:
    if not isinstance(node, dict) or depth > MAX_DEPTH:
        return None
    kind = node.get("type")
    if kind == "text":
        text = _text(node.get("text"), 20_000)
        if not text:
            return None
        out = {"type": "text", "text": text}
        marks = _clean_marks(node.get("marks"), keep_notes)
        if marks:
            out["marks"] = marks
        return out
    if kind == "hardBreak":
        return {"type": "hardBreak"}
    if kind not in BLOCK_NODES:
        # Unknown wrapper (pasted content the editor did not understand): keep its children.
        return None
    out = {"type": kind}
    attrs = _clean_attrs(kind, node.get("attrs") or {})
    if kind in ("image", "video", "audio") and not attrs["src"]:
        return None
    if attrs:
        out["attrs"] = attrs
    children = [c for c in (_clean_node(c, keep_notes, depth + 1) for c in node.get("content") or []) if c]
    if children:
        out["content"] = children
    return out


def clean_doc(doc: object, keep_notes: bool = True) -> dict:
    """An allow-listed copy of a TipTap document. Raises ValueError when it is too large to be a story."""
    if not isinstance(doc, dict) or doc.get("type") != "doc":
        return {"type": "doc", "content": []}
    if len(json.dumps(doc)) > MAX_DOC_BYTES:
        raise ValueError("This story is too long. Split it into two stories.")
    content = [c for c in (_clean_node(c, keep_notes, 1) for c in doc.get("content") or []) if c and c["type"] not in INLINE_NODES]
    return {"type": "doc", "content": content}


# ---------------------------------------------------------------- plain text


def doc_text(node: object) -> str:
    """Readable plain text of a document or node: paragraphs separated by blank lines."""
    if not isinstance(node, dict):
        return ""
    kind = node.get("type")
    if kind == "text":
        return str(node.get("text", ""))
    if kind == "hardBreak":
        return "\n"
    inner = node.get("content") or []
    if kind in ("doc", "bulletList", "orderedList", "blockquote", "factBox", "table", "listItem"):
        sep = "\n" if kind in ("bulletList", "orderedList", "listItem", "table") else "\n\n"
        return sep.join(t for t in (doc_text(c) for c in inner) if t)
    if kind == "tableRow":
        return " | ".join(doc_text(c) for c in inner)
    attrs = node.get("attrs") or {}
    if kind in ("image", "video", "audio"):
        return str(attrs.get("caption", ""))
    return "".join(doc_text(c) for c in inner)


def word_count(text: str) -> int:
    return len(text.split())


def note_ids(node: object) -> set[str]:
    """Ids of every review note still anchored in the document."""
    found: set[str] = set()
    if isinstance(node, dict):
        for m in node.get("marks") or []:
            if isinstance(m, dict) and m.get("type") == "note":
                found.add(str((m.get("attrs") or {}).get("id", "")))
        for c in node.get("content") or []:
            found |= note_ids(c)
    return found


def media_srcs(node: object) -> list[str]:
    out: list[str] = []
    if isinstance(node, dict):
        if node.get("type") in ("image", "video", "audio"):
            out.append(str((node.get("attrs") or {}).get("src", "")))
        for c in node.get("content") or []:
            out.extend(media_srcs(c))
    return out


# ---------------------------------------------------------------- Reader blocks


def _styles(marks: list[dict]) -> tuple[dict, str]:
    styles: dict[str, Any] = {}
    href = ""
    for m in marks:
        kind, attrs = m.get("type"), m.get("attrs") or {}
        if kind in ("bold", "italic", "underline", "strike", "code"):
            styles[kind] = True
        elif kind == "subscript":
            styles["sub"] = True
        elif kind == "superscript":
            styles["sup"] = True
        elif kind == "highlight":
            styles["highlight"] = attrs.get("color", "yellow")
        elif kind == "textStyle" and attrs.get("color"):
            styles["textColor"] = attrs["color"]
        elif kind == "link":
            href = attrs.get("href", "")
    return styles, href


def _inline(nodes: list[dict]) -> list[dict]:
    out: list[dict] = []
    for n in nodes:
        if n.get("type") == "hardBreak":
            text, styles, href = "\n", {}, ""
        elif n.get("type") == "text":
            styles, href = _styles(n.get("marks") or [])
            text = n.get("text", "")
        else:
            continue
        piece = {"type": "text", "text": text, "styles": styles}
        if href:
            last = out[-1] if out else None
            if last and last.get("type") == "link" and last["href"] == href:
                last["content"].append(piece)
            else:
                out.append({"type": "link", "href": href, "content": [piece]})
        else:
            last = out[-1] if out else None
            if last and last.get("type") == "text" and last["styles"] == styles:
                last["text"] += text
            else:
                out.append(piece)
    return out


def _paragraph_inline(nodes: list[dict]) -> list[dict]:
    """Inline content of block children (quotes, list items, cells), paragraphs joined by line breaks."""
    joined: list[dict] = []
    for i, n in enumerate(nodes):
        if n.get("type") in ("paragraph", "heading"):
            if i:
                joined.append({"type": "hardBreak"})
            joined.extend(n.get("content") or [])
    return _inline(joined)


class _Ids:
    def __init__(self, prefix: str):
        self.prefix, self.n = prefix, 0

    def __call__(self) -> str:
        self.n += 1
        return f"{self.prefix}{self.n}"


def _list_items(node: dict, ordered: bool, ids: _Ids) -> list[dict]:
    kind = "numberedListItem" if ordered else "bulletListItem"
    out: list[dict] = []
    for item in node.get("content") or []:
        parts = item.get("content") or []
        text_nodes = [p for p in parts if p.get("type") in ("paragraph", "heading")]
        children: list[dict] = []
        for p in parts:
            if p.get("type") in ("bulletList", "orderedList"):
                children.extend(_list_items(p, p["type"] == "orderedList", ids))
        out.append({"id": ids(), "type": kind, "props": {}, "content": _paragraph_inline(text_nodes), "children": children})
    return out


def _block(node: dict, ids: _Ids) -> list[dict]:
    kind, attrs, inner = node.get("type"), node.get("attrs") or {}, node.get("content") or []
    if kind == "paragraph":
        content = _inline(inner)
        if not content:
            return []
        props = {"textAlignment": attrs["textAlign"]} if attrs.get("textAlign") else {}
        return [{"id": ids(), "type": "paragraph", "props": props, "content": content, "children": []}]
    if kind == "heading":
        props: dict[str, Any] = {"level": attrs.get("level", 2)}
        if attrs.get("textAlign"):
            props["textAlignment"] = attrs["textAlign"]
        return [{"id": ids(), "type": "heading", "props": props, "content": _inline(inner), "children": []}]
    if kind == "blockquote":
        return [{"id": ids(), "type": "quote", "props": {}, "content": _paragraph_inline(inner), "children": []}]
    if kind == "pullQuote":
        return [{"id": ids(), "type": "pullquote", "props": {"cite": attrs.get("cite", "")}, "content": _paragraph_inline(inner), "children": []}]
    if kind in ("bulletList", "orderedList"):
        return _list_items(node, kind == "orderedList", ids)
    if kind == "horizontalRule":
        return [{"id": ids(), "type": "divider", "props": {}, "content": [], "children": []}]
    if kind in ("image", "video", "audio"):
        props = {"url": attrs.get("src", ""), "caption": attrs.get("caption", ""), "credit": attrs.get("credit", ""), "name": attrs.get("alt", "")}
        if kind == "video" and attrs.get("poster"):
            props["posterUrl"] = attrs["poster"]
        return [{"id": ids(), "type": kind, "props": props, "content": [], "children": []}]
    if kind == "table":
        rows, header = [], False
        for r, row in enumerate(inner):
            cells = row.get("content") or []
            if r == 0 and cells and all(c.get("type") == "tableHeader" for c in cells):
                header = True
            rows.append({"cells": [_paragraph_inline(c.get("content") or []) for c in cells]})
        return [{"id": ids(), "type": "table", "props": {"header": header}, "content": {"type": "tableContent", "rows": rows}, "children": []}]
    if kind == "factBox":
        children = [b for c in inner for b in _block(c, ids)]
        return [{"id": ids(), "type": "factbox", "props": {"title": attrs.get("title", "")}, "content": [], "children": children}]
    return []


def to_blocks(doc: dict, prefix: str = "b") -> list[dict]:
    """Reader blocks for a cleaned document. Review notes never reach readers."""
    clean = clean_doc(doc, keep_notes=False)
    ids = _Ids(prefix)
    return [b for node in clean["content"] for b in _block(node, ids)]
