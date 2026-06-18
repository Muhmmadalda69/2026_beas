"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useRef } from "react";

// Self-hosted TinyMCE editor (GPL, no API key, no CDN). It emits HTML which is
// sanitized server-side before display. We use the uncontrolled `initialValue`
// pattern + `onEditorChange`, so parent re-renders never reset the document.
export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  // Capture the initial value once; the editor owns its state afterwards.
  const initial = useRef(value).current;

  return (
    <Editor
      // Load TinyMCE from our own /public assets (copied at build time).
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      initialValue={initial}
      onEditorChange={(html) => onChange(html)}
      init={{
        height: 460,
        menubar: false,
        branding: false,
        promotion: false,
        skin_url: "/tinymce/skins/ui/oxide",
        content_css: "/tinymce/skins/content/default/content.min.css",
        plugins: [
          "advlist", "autolink", "lists", "link", "image", "charmap",
          "searchreplace", "visualblocks", "code", "fullscreen",
          "table", "preview", "wordcount", "help",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "forecolor backcolor | alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | blockquote link image table | " +
          "hr removeformat | searchreplace visualblocks code preview fullscreen help",
        block_formats:
          "Paragraf=p; Judul 1=h1; Judul 2=h2; Judul 3=h3; Kutipan=blockquote; Kode=pre",
        // Surface Aksara Sunda glyphs inside the editor too.
        content_style: `
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sundanese&display=swap');
          body { font-family: Georgia, serif; font-size: 16px; line-height: 1.7; }
          :is(p,h1,h2,h3,li):lang(su) { font-family: 'Noto Sans Sundanese', serif; }
        `,
      }}
    />
  );
}
