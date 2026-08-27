"use client";
import TextConvert from "./_text-convert";
import { htmlToText } from "../../lib/dataConvert";

export default function HtmlToText() {
  return (
    <TextConvert
      inLabel="Paste your HTML"
      outLabel="Plain text"
      actionLabel="Strip the tags"
      transform={htmlToText}
      downloadName="text.txt"
      downloadMime="text/plain"
      placeholder={"<h1>Title</h1>\n<p>Some <b>bold</b> text with a <a href=\"#\">link</a>.</p>"}
    />
  );
}
