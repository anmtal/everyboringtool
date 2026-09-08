"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Parse a dotted-quad IPv4 string into an array of four 0-255 octets.
// Returns null when the input is not a syntactically valid IPv4 address.
function parseIp(str) {
  if (typeof str !== "string") return null;
  const parts = str.trim().split(".");
  if (parts.length !== 4) return null;
  const octets = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

// Convert four octets to an unsigned 32-bit integer (kept as a JS number,
// using >>> 0 so bitwise math stays unsigned).
function ipToInt(octets) {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

// Convert an unsigned 32-bit integer back to a dotted-quad string.
function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
}

// Build the 32-bit netmask for a given prefix length (0-32).
function prefixToMaskInt(prefix) {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

// Turn an unsigned 32-bit int into a padded binary string grouped by octet.
function intToBinary(int) {
  const bits = int.toString(2).padStart(32, "0");
  return bits.slice(0, 8) + "." + bits.slice(8, 16) + "." + bits.slice(16, 24) + "." + bits.slice(24);
}

export default function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.10");
  const [prefix, setPrefix] = useState(24);

  const result = useMemo(() => {
    const octets = parseIp(ip);
    if (!octets) return { error: "Enter a valid IPv4 address, e.g. 192.168.1.10." };
    const p = Number(prefix);
    if (!Number.isInteger(p) || p < 0 || p > 32) {
      return { error: "Prefix length must be a whole number from 0 to 32." };
    }

    const ipInt = ipToInt(octets);
    const maskInt = prefixToMaskInt(p);
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    const totalAddresses = Math.pow(2, 32 - p);
    let usableHosts;
    let firstHostInt;
    let lastHostInt;

    if (p === 32) {
      usableHosts = 1; // single host route
      firstHostInt = networkInt;
      lastHostInt = networkInt;
    } else if (p === 31) {
      usableHosts = 2; // RFC 3021 point-to-point link
      firstHostInt = networkInt;
      lastHostInt = broadcastInt;
    } else {
      usableHosts = totalAddresses - 2;
      firstHostInt = (networkInt + 1) >>> 0;
      lastHostInt = (broadcastInt - 1) >>> 0;
    }

    // IPv4 class of the first octet (informational / legacy).
    const first = octets[0];
    let ipClass = "—";
    if (first < 128) ipClass = "A";
    else if (first < 192) ipClass = "B";
    else if (first < 224) ipClass = "C";
    else if (first < 240) ipClass = "D (multicast)";
    else ipClass = "E (reserved)";

    // Is this a private (RFC 1918) or otherwise special-use address?
    let scope = "Public";
    if (first === 10) scope = "Private (RFC 1918)";
    else if (first === 172 && octets[1] >= 16 && octets[1] <= 31) scope = "Private (RFC 1918)";
    else if (first === 192 && octets[1] === 168) scope = "Private (RFC 1918)";
    else if (first === 127) scope = "Loopback";
    else if (first === 169 && octets[1] === 254) scope = "Link-local (APIPA)";
    else if (first >= 224) scope = "Multicast / reserved";

    return {
      cidr: intToIp(networkInt) + "/" + p,
      netmask: intToIp(maskInt),
      wildcard: intToIp(wildcardInt),
      network: intToIp(networkInt),
      broadcast: p >= 31 ? "—" : intToIp(broadcastInt),
      firstHost: intToIp(firstHostInt),
      lastHost: intToIp(lastHostInt),
      hostRange:
        usableHosts <= 1
          ? intToIp(firstHostInt)
          : intToIp(firstHostInt) + " – " + intToIp(lastHostInt),
      totalAddresses,
      usableHosts,
      maskBinary: intToBinary(maskInt),
      networkBinary: intToBinary(networkInt),
      ipClass,
      scope,
    };
  }, [ip, prefix]);

  const [copied, setCopied] = useState("");

  async function copy(text, key) {
    try {
      await copyText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  const prefixOptions = [];
  for (let i = 32; i >= 0; i--) {
    prefixOptions.push(i);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sc-ip">
              IPv4 address
            </label>
            <input
              id="sc-ip"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="decimal"
              placeholder="192.168.1.10"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="sc-prefix">
              Subnet prefix (CIDR)
            </label>
            <select
              id="sc-prefix"
              className="tool-select"
              value={prefix}
              onChange={(e) => setPrefix(Number(e.target.value))}
            >
              {prefixOptions.map((p) => (
                <option key={p} value={p}>
                  /{p} — {intToIp(prefixToMaskInt(p))}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {result.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {result.error}
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Network (CIDR)</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div className="tool-result-value">{result.cidr}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copy(result.cidr, "cidr")}
              >
                {copied === "cidr" ? "Copied!" : "Copy CIDR"}
              </button>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.usableHosts.toLocaleString()}</div>
              <div className="tool-stat-label">Usable hosts</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.totalAddresses.toLocaleString()}</div>
              <div className="tool-stat-label">Total addresses</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">/{Number(prefix)}</div>
              <div className="tool-stat-label">Prefix length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.ipClass}</div>
              <div className="tool-stat-label">Class</div>
            </div>
          </div>

          {[
            { key: "netmask", label: "Subnet mask", value: result.netmask },
            { key: "wildcard", label: "Wildcard mask", value: result.wildcard },
            { key: "network", label: "Network address", value: result.network },
            { key: "broadcast", label: "Broadcast address", value: result.broadcast },
            { key: "hostRange", label: "Usable host range", value: result.hostRange },
            { key: "scope", label: "Address scope", value: result.scope },
          ].map((row) => (
            <div className="tool-result" role="status" aria-live="polite" key={row.key}>
              <div className="tool-result-label">{row.label}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="tool-result-value">{row.value}</div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copy(row.value, row.key)}
                >
                  {copied === row.key ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}

          <div className="tool-result">
            <div className="tool-result-label">Binary breakdown</div>
            <pre className="tool-output">
{`Netmask:  ${result.maskBinary}
Network:  ${result.networkBinary}`}
            </pre>
          </div>
        </>
      )}

      <p className="tool-note">
        Enter any IPv4 address and pick a CIDR prefix (/0 to /32) to get the
        network and broadcast addresses, subnet and wildcard masks, usable host
        range, and host counts. /31 links (RFC 3021) show two usable hosts and
        no broadcast; /32 is treated as a single host route. Everything is
        computed in your browser — nothing is sent anywhere.
      </p>
    </div>
  );
}
