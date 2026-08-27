"use client";
import { load } from "js-yaml";
import TextConvert from "./_text-convert";

function transform(input) {
  const s = (input || "").trim();
  if (!s) throw new Error("Paste some YAML to convert.");
  let data;
  try { data = load(s); } catch { throw new Error("That doesn't look like valid YAML — check the indentation."); }
  return JSON.stringify(data, null, 2);
}

export default function YamlToJson() {
  return (
    <TextConvert
      inLabel="Paste your YAML"
      outLabel="JSON"
      actionLabel="Convert to JSON"
      transform={transform}
      downloadName="data.json"
      downloadMime="application/json"
      placeholder={"name: Ada\nrole: Engineer\ntags:\n  - scrabble\n  - words"}
    />
  );
}
