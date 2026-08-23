import { PDFDocument } from "pdf-lib";

// Shown when the user gives us a password-protected PDF.
export const ENCRYPTED_MSG =
  "This PDF is password-protected, so it can't be edited here. Open it in a PDF viewer using the password, choose Print → Save as PDF to make an unprotected copy, then try again.";

export function isEncryptedError(err) {
  return /encrypted/i.test(String((err && err.message) || ""));
}

/**
 * Load a PDF for editing.
 *
 * Deliberately does NOT pass `ignoreEncryption: true`. pdf-lib cannot decrypt,
 * so ignoring encryption produces a document whose streams are still encrypted
 * and whose output still carries an /Encrypt dictionary — a file no reader can
 * open, handed to the user as a success. Verified: saving such a document
 * yields bytes that PDFDocument.load() itself then rejects.
 *
 * Letting the load throw means an encrypted input fails loudly and honestly.
 */
export async function loadPdf(bytes) {
  return PDFDocument.load(bytes);
}
