"use client";
import { dump } from "js-yaml";
import TextConvert from "./_text-convert";

function transform(input) {
  const s = (input || "").trim();
  if (!s) throw new Error("Paste some JSON to convert.");
  let data;
  try { data = JSON.parse(s); } catch { throw new Error("That doesn't look like valid JSON."); }
  return dump(data, { indent: 2, lineWidth: -1 });
}

export default function JsonToYaml() {
  return (
    <TextConvert
      inLabel="Paste your JSON"
      outLabel="YAML"
      actionLabel="Convert to YAML"
      transform={transform}
      downloadName="data.yaml"
      downloadMime="text/yaml"
      placeholder={'{\n  "name": "Ada",\n  "role": "Engineer",\n  "tags": ["scrabble", "words"]\n}'}
    />
  );
}
