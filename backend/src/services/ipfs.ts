import FormData from "form-data";
import axios from "axios";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// IPFS Service (via Pinata)
// ─────────────────────────────────────────────────────────────────────────────

const PINATA_BASE = "https://api.pinata.cloud";
const GATEWAY = process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

function authHeaders() {
  const jwt = process.env.PINATA_JWT;
  if (jwt) return { Authorization: `Bearer ${jwt}` };
  return {
    pinata_api_key: process.env.PINATA_API_KEY ?? "",
    pinata_secret_api_key: process.env.PINATA_API_SECRET ?? "",
  };
}

// ── Pin JSON metadata ─────────────────────────────────────────────────────────
export async function pinJSON(
  data: Record<string, unknown>,
  name: string
): Promise<string> {
  const res = await axios.post(
    `${PINATA_BASE}/pinning/pinJSONToIPFS`,
    {
      pinataContent: data,
      pinataMetadata: { name },
    },
    { headers: { ...authHeaders(), "Content-Type": "application/json" } }
  );
  const cid: string = res.data.IpfsHash;
  logger.info(`📌 Pinned JSON to IPFS: ${cid}`);
  return cid;
}

// ── Pin a file Buffer ─────────────────────────────────────────────────────────
export async function pinFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const form = new FormData();
  form.append("file", fileBuffer, {
    filename: fileName,
    contentType: mimeType,
  });
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName })
  );

  const res = await axios.post(`${PINATA_BASE}/pinning/pinFileToIPFS`, form, {
    headers: { ...authHeaders(), ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const cid: string = res.data.IpfsHash;
  logger.info(`📌 Pinned file to IPFS: ${cid}`);
  return cid;
}

// ── Pin paper metadata + abstract ─────────────────────────────────────────────
export async function pinPaperMetadata(params: {
  title: string;
  authors: string[];
  abstract: string;
  field: string;
  pdfCid: string;
}): Promise<string> {
  return pinJSON(
    {
      ...params,
      version: "ssn-v1",
      timestamp: new Date().toISOString(),
    },
    `ssn-paper-meta-${Date.now()}`
  );
}

// ── Pin review comment ────────────────────────────────────────────────────────
export async function pinReviewComment(params: {
  comment: string;
  rating: number;
  paperId: number;
}): Promise<string> {
  return pinJSON(
    { ...params, version: "ssn-review-v1", timestamp: new Date().toISOString() },
    `ssn-review-${params.paperId}-${Date.now()}`
  );
}

// ── Fetch content from IPFS ───────────────────────────────────────────────────
export async function fetchFromIPFS(cid: string): Promise<unknown> {
  const url = `${GATEWAY}/ipfs/${cid}`;
  const res = await axios.get(url, { timeout: 10_000 });
  return res.data;
}

// ── Get IPFS gateway URL ───────────────────────────────────────────────────────
export function ipfsUrl(cid: string): string {
  return `${GATEWAY}/ipfs/${cid}`;
}
