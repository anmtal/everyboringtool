"use client";
import DocForm from "./_doc-form";

const DISCLAIMER = "This is a plain-language template to get you started — not legal advice. Some sales (such as vehicles) have specific local requirements; check what your area needs.";

const FIELDS = [
  { name: "date", label: "Date of sale", type: "date" },
  { name: "seller", label: "Seller's full name", placeholder: "Alex Seller" },
  { name: "buyer", label: "Buyer's full name", placeholder: "Sam Buyer" },
  { name: "item", label: "Item description", type: "textarea", placeholder: "2015 Toyota Corolla, VIN 1234..., blue, 80,000 miles" },
  { name: "price", label: "Sale price", placeholder: "$4,500" },
  { name: "location", label: "Location (city, state)", placeholder: "Austin, TX" },
  { name: "asis", label: "Sold as-is, with no warranty", type: "checkbox", default: true },
];

function build(v) {
  const L = [];
  L.push("BILL OF SALE", "", `Date: ${v.date || "[date]"}`, "");
  L.push(`Seller: ${v.seller || "[Seller name]"}`);
  L.push(`Buyer: ${v.buyer || "[Buyer name]"}`, "");
  L.push("For good and valuable consideration, the Seller hereby sells and transfers to the Buyer the following item:", "");
  L.push(v.item || "[Description of item]", "");
  L.push(`Sale price: ${v.price || "[amount]"}`, "");
  L.push("The Seller certifies that they are the lawful owner of the item, have the right to sell it, and that it is free of any liens or claims except as noted above.", "");
  L.push(v.asis
    ? "The item is sold AS-IS, WHERE-IS, with no warranties of any kind, whether express or implied."
    : "Any warranties are as agreed separately in writing between the parties.");
  L.push("", "Seller signature: ______________________   Date: __________", "", "Buyer signature: ______________________   Date: __________", "");
  L.push(`Location: ${v.location || "[city, state]"}`);
  return L.join("\n");
}

export default function BillOfSale() {
  return <DocForm fields={FIELDS} build={build} actionLabel="Generate bill of sale" downloadName="bill-of-sale.txt" disclaimer={DISCLAIMER} />;
}
