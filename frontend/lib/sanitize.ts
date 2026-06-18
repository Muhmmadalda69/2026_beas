import sanitizeHtml from "sanitize-html";
import { renderMarkdown } from "./markdown";

// Safe color values: hex, rg(a), hsl(a), or a bare colour name.
const colorRe = [
  /^#(?:[0-9a-f]{3,8})$/i,
  /^rgba?\(\s*[\d.,\s%]+\)$/i,
  /^hsla?\(\s*[\d.,\s%]+\)$/i,
  /^[a-z]+$/i,
];
const lengthRe = [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/];

// Allowlist tuned to what the TinyMCE editor can produce. Anything outside this
// set (scripts, styles, event handlers, iframes, unknown schemes) is dropped.
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "span", "div",
    "strong", "b", "em", "i", "u", "s", "strike", "mark", "sub", "sup", "small",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a", "img",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "style"],
    span: ["style"],
    div: ["style"],
    p: ["style"],
    h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
    li: ["style"],
    blockquote: ["style"],
    table: ["style", "border"],
    col: ["span", "style"],
    colgroup: ["span", "style"],
    td: ["style", "colspan", "rowspan", "scope"],
    th: ["style", "colspan", "rowspan", "scope"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      // TinyMCE applies underline/strikethrough as inline text-decoration.
      "text-decoration": [
        /^(none|underline|overline|line-through)(\s+(underline|overline|line-through))*$/i,
      ],
      "text-decoration-line": [
        /^(none|underline|overline|line-through)(\s+(underline|overline|line-through))*$/i,
      ],
      "font-weight": [/^(bold|bolder|[1-9]00)$/],
      "font-style": [/^(italic|normal|oblique)$/],
      color: colorRe,
      "background-color": colorRe,
      "padding-left": lengthRe,
      "margin-left": lengthRe,
      width: lengthRe,
      height: lengthRe,
      "border-collapse": [/^(collapse|separate)$/],
      float: [/^(left|right|none)$/],
    },
  },
  // Images may load over http(s) only (no data: URIs to bound stored size).
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
};

/**
 * Renders article content to safe HTML. Newer articles are stored as HTML (from
 * the WYSIWYG editor); older ones may be Markdown. Both paths are sanitized.
 */
export function renderArticleHtml(content: string): string {
  const trimmed = content.trimStart();
  const html = trimmed.startsWith("<") ? content : renderMarkdown(content);
  return sanitizeHtml(html, options);
}
