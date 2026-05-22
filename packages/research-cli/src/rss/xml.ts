import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  removeNSPrefix: true,
  textNodeName: "#text",
  trimValues: true
});

export function parseXmlDocument(xml: string): unknown {
  return parser.parse(xml);
}

export function textValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return textValue(value[0]);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return textValue(record["#text"]);
  }
  return "";
}

export function arrayValue(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function attrValue(value: unknown, name: string): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return textValue(record[`@_${name}`]);
}

export function childText(record: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const exact = record[name];
    const value = exact ?? childByLocalName(record, name);
    const text = textValue(value);
    if (text) return text;
  }
  return "";
}

export function childByLocalName(record: Record<string, unknown>, name: string): unknown {
  const target = normalizeName(name);
  for (const [key, value] of Object.entries(record)) {
    if (normalizeName(key) === target) return value;
  }
  return undefined;
}

export function childrenByLocalName(record: Record<string, unknown>, name: string): unknown[] {
  return arrayValue(childByLocalName(record, name));
}

export function normalizeName(name: string): string {
  return name.replace(/^@_/, "").split(":").pop()?.toLowerCase() ?? name.toLowerCase();
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
