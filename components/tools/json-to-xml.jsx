"use client";
import TextConvert from "./_text-convert";
import { jsonToXml } from "../../lib/dataConvert";

export default function JsonToXml() {
  return (
    <TextConvert
      inLabel="Paste your JSON"
      outLabel="XML"
      actionLabel="Convert to XML"
      transform={jsonToXml}
      downloadName="data.xml"
      downloadMime="application/xml"
      placeholder={'{\n  "note": {\n    "to": "You",\n    "from": "Me",\n    "body": "Hello"\n  }\n}'}
    />
  );
}
