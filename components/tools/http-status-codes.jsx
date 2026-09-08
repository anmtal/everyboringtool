"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Standard HTTP status codes. Descriptions summarize the intent from the
// relevant RFCs (RFC 9110 and friends). Kept concise on purpose.
const CODES = [
  // 1xx — Informational
  { code: 100, name: "Continue", desc: "The server received the request headers and the client should proceed to send the request body." },
  { code: 101, name: "Switching Protocols", desc: "The server is switching protocols as requested by the client (e.g. upgrading to WebSocket)." },
  { code: 102, name: "Processing", desc: "WebDAV: the server has accepted the request but has not yet completed it." },
  { code: 103, name: "Early Hints", desc: "Used to return some response headers (like Link) before the final response is ready, so the browser can preload resources." },

  // 2xx — Success
  { code: 200, name: "OK", desc: "The request succeeded. The meaning depends on the method: GET returns the resource, POST returns the result of the action." },
  { code: 201, name: "Created", desc: "The request succeeded and a new resource was created. The new URL is usually returned in the Location header." },
  { code: 202, name: "Accepted", desc: "The request has been accepted for processing, but the processing has not completed. Common for async jobs." },
  { code: 203, name: "Non-Authoritative Information", desc: "The returned metadata is from a local or third-party copy, not the origin server." },
  { code: 204, name: "No Content", desc: "The request succeeded but there is no content to send back. The response body is empty." },
  { code: 205, name: "Reset Content", desc: "Tells the client to reset the document view that sent the request, e.g. clear a form." },
  { code: 206, name: "Partial Content", desc: "The server is delivering only part of the resource, in response to a Range header. Used for resumable downloads and video streaming." },
  { code: 207, name: "Multi-Status", desc: "WebDAV: conveys information about multiple resources where several status codes might apply." },
  { code: 208, name: "Already Reported", desc: "WebDAV: the members of a binding have already been enumerated and are not being included again." },
  { code: 226, name: "IM Used", desc: "The server fulfilled a GET request and the response is the result of instance manipulations applied to the current instance." },

  // 3xx — Redirection
  { code: 300, name: "Multiple Choices", desc: "The request has more than one possible response. The user or user agent should choose one of them." },
  { code: 301, name: "Moved Permanently", desc: "The resource has permanently moved to a new URL. Search engines update their links. Use for permanent redirects." },
  { code: 302, name: "Found", desc: "The resource is temporarily at a different URL. The client should keep using the original URL for future requests." },
  { code: 303, name: "See Other", desc: "The response can be found at another URL and should be retrieved with a GET request. Common after a POST." },
  { code: 304, name: "Not Modified", desc: "The cached version of the resource is still valid, so the client can reuse it. No body is sent." },
  { code: 307, name: "Temporary Redirect", desc: "Like 302, but the request method must not change when redirecting. A POST stays a POST." },
  { code: 308, name: "Permanent Redirect", desc: "Like 301, but the request method must not change when redirecting. A POST stays a POST." },

  // 4xx — Client errors
  { code: 400, name: "Bad Request", desc: "The server cannot process the request due to a client error, such as malformed syntax or invalid parameters." },
  { code: 401, name: "Unauthorized", desc: "Authentication is required and has failed or not been provided. Despite the name, it means unauthenticated." },
  { code: 402, name: "Payment Required", desc: "Reserved for future use. Occasionally used by APIs to signal that payment or a paid plan is required." },
  { code: 403, name: "Forbidden", desc: "The server understood the request but refuses to authorize it. Authenticating will not help — access is denied." },
  { code: 404, name: "Not Found", desc: "The server cannot find the requested resource. The URL is not recognized. Very common for broken links." },
  { code: 405, name: "Method Not Allowed", desc: "The request method is known but not supported for this resource, e.g. sending POST to a read-only endpoint." },
  { code: 406, name: "Not Acceptable", desc: "The server cannot produce a response matching the Accept headers sent by the client." },
  { code: 407, name: "Proxy Authentication Required", desc: "The client must first authenticate with a proxy before the request can be served." },
  { code: 408, name: "Request Timeout", desc: "The server timed out waiting for the request. The client took too long to send it." },
  { code: 409, name: "Conflict", desc: "The request conflicts with the current state of the resource, e.g. an edit conflict or duplicate entry." },
  { code: 410, name: "Gone", desc: "The resource is permanently gone and no forwarding address is known. More specific than 404." },
  { code: 411, name: "Length Required", desc: "The server requires a Content-Length header, which was not provided." },
  { code: 412, name: "Precondition Failed", desc: "One or more conditions in the request headers (like If-Match) evaluated to false." },
  { code: 413, name: "Payload Too Large", desc: "The request body is larger than the server is willing or able to process." },
  { code: 414, name: "URI Too Long", desc: "The requested URL is longer than the server is willing to interpret." },
  { code: 415, name: "Unsupported Media Type", desc: "The request body is in a format the server does not support, e.g. wrong Content-Type." },
  { code: 416, name: "Range Not Satisfiable", desc: "The Range header requests a portion of the file that the server cannot supply." },
  { code: 417, name: "Expectation Failed", desc: "The expectation given in the Expect request header could not be met by the server." },
  { code: 418, name: "I'm a teapot", desc: "An April Fools' joke code from RFC 2324. The server refuses to brew coffee because it is a teapot." },
  { code: 421, name: "Misdirected Request", desc: "The request was directed at a server that cannot produce a response for the requested authority." },
  { code: 422, name: "Unprocessable Entity", desc: "The request is well-formed but has semantic errors, so the server cannot process it. Common for validation errors in APIs." },
  { code: 423, name: "Locked", desc: "WebDAV: the resource being accessed is locked." },
  { code: 424, name: "Failed Dependency", desc: "WebDAV: the request failed because it depended on another request that failed." },
  { code: 425, name: "Too Early", desc: "The server is unwilling to risk processing a request that might be replayed." },
  { code: 426, name: "Upgrade Required", desc: "The client should switch to a different protocol given in the Upgrade header." },
  { code: 428, name: "Precondition Required", desc: "The server requires the request to be conditional, to prevent lost-update conflicts." },
  { code: 429, name: "Too Many Requests", desc: "The client has sent too many requests in a given time (rate limiting). Check the Retry-After header." },
  { code: 431, name: "Request Header Fields Too Large", desc: "The server refuses the request because the header fields are too large." },
  { code: 451, name: "Unavailable For Legal Reasons", desc: "The resource is unavailable due to legal demands, such as censorship or a takedown." },

  // 5xx — Server errors
  { code: 500, name: "Internal Server Error", desc: "A generic error: the server hit an unexpected condition and could not complete the request. Check server logs." },
  { code: 501, name: "Not Implemented", desc: "The server does not support the functionality required to fulfill the request, e.g. an unknown method." },
  { code: 502, name: "Bad Gateway", desc: "The server, acting as a gateway or proxy, got an invalid response from an upstream server." },
  { code: 503, name: "Service Unavailable", desc: "The server is not ready to handle the request, usually due to overload or maintenance. Often temporary." },
  { code: 504, name: "Gateway Timeout", desc: "The server, acting as a gateway or proxy, did not get a timely response from an upstream server." },
  { code: 505, name: "HTTP Version Not Supported", desc: "The server does not support the HTTP protocol version used in the request." },
  { code: 506, name: "Variant Also Negotiates", desc: "The server has an internal configuration error in transparent content negotiation." },
  { code: 507, name: "Insufficient Storage", desc: "WebDAV: the server cannot store the representation needed to complete the request." },
  { code: 508, name: "Loop Detected", desc: "WebDAV: the server detected an infinite loop while processing the request." },
  { code: 510, name: "Not Extended", desc: "Further extensions to the request are required for the server to fulfill it." },
  { code: 511, name: "Network Authentication Required", desc: "The client needs to authenticate to gain network access, e.g. a captive portal on public Wi-Fi." },
];

const CLASSES = [
  { key: "1", label: "1xx Informational", note: "The request was received and the process is continuing." },
  { key: "2", label: "2xx Success", note: "The request was successfully received, understood, and accepted." },
  { key: "3", label: "3xx Redirection", note: "Further action is needed to complete the request." },
  { key: "4", label: "4xx Client Error", note: "The request contains bad syntax or cannot be fulfilled." },
  { key: "5", label: "5xx Server Error", note: "The server failed to fulfill a valid request." },
];

function classOf(code) {
  return String(code)[0];
}

export default function HttpStatusCodes() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CODES.filter((c) => {
      if (filter !== "all" && classOf(c.code) !== filter) return false;
      if (!q) return true;
      return (
        String(c.code).includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  // Group visible results by their class for display.
  const grouped = useMemo(() => {
    const map = {};
    for (const c of results) {
      const k = classOf(c.code);
      if (!map[k]) map[k] = [];
      map[k].push(c);
    }
    return map;
  }, [results]);

  async function handleCopy(c) {
    try {
      await copyText(`${c.code} ${c.name} — ${c.desc}`);
      setCopied(c.code);
      setTimeout(() => setCopied(0), 1500);
    } catch (e) {
      setCopied(0);
    }
  }

  const counts = useMemo(() => {
    const byClass = {};
    for (const c of CODES) {
      const k = classOf(c.code);
      byClass[k] = (byClass[k] || 0) + 1;
    }
    return byClass;
  }, []);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="http-search">
              Search by code, name, or meaning
            </label>
            <input
              id="http-search"
              className="tool-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 404, forbidden, redirect, rate limit"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="http-filter">
              Filter by class
            </label>
            <select
              id="http-filter"
              className="tool-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All classes</option>
              {CLASSES.map((cl) => (
                <option key={cl.key} value={cl.key}>
                  {cl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-stat-grid">
        {CLASSES.map((cl) => (
          <button
            key={cl.key}
            type="button"
            className="tool-stat"
            onClick={() => setFilter(filter === cl.key ? "all" : cl.key)}
            style={{ cursor: "pointer", textAlign: "left" }}
            aria-pressed={filter === cl.key}
          >
            <span className="tool-stat-num">{cl.key}xx</span>
            <span className="tool-stat-label">
              {cl.label.replace(/^\dxx /, "")} ({counts[cl.key] || 0})
            </span>
          </button>
        ))}
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">
          {results.length === 0
            ? "No matching status codes"
            : `${results.length} status code${results.length === 1 ? "" : "s"}`}
        </div>

        {results.length === 0 ? (
          <p className="tool-note">
            No HTTP status code matches “{query.trim()}”. Try a number like 404 or
            500, a keyword like “redirect”, or clear the search.
          </p>
        ) : (
          CLASSES.filter((cl) => grouped[cl.key] && grouped[cl.key].length).map(
            (cl) => (
              <div key={cl.key} className="tool-field">
                <div className="tool-result-label">{cl.label}</div>
                <p className="tool-note">{cl.note}</p>
                {grouped[cl.key].map((c) => (
                  <div key={c.code} className="tool-stat" style={{ marginBottom: 8 }}>
                    <div className="tool-result-value">
                      <strong>{c.code}</strong> {c.name}
                    </div>
                    <p className="tool-note">{c.desc}</p>
                    <div className="tool-actions">
                      <button
                        type="button"
                        className={copied === c.code ? "btn btn-success" : "btn"}
                        onClick={() => handleCopy(c)}
                      >
                        {copied === c.code ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      <p className="tool-note">
        A quick reference for standard HTTP response status codes (RFC 9110 and
        related specs), including WebDAV and common extensions. Everything runs in
        your browser — nothing is sent anywhere.
      </p>
    </div>
  );
}
