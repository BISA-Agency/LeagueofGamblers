import { createHash } from "node:crypto";

/**
 * The chains we accept USDT on, and where it lands. These are receiving
 * addresses — public by nature, since every paying player sees them — but a
 * wrong character means an irrecoverable loss, so each one is checksum-checked
 * by `npm run check-addresses` before it ships.
 *
 * Ethereum and BNB Chain share an address on purpose: both are EVM chains, so
 * the same key controls the same address on each.
 */
export type NetworkId = "ethereum" | "tron" | "solana" | "bsc";

export type Network = {
  id: NetworkId;
  label: string;
  /** Must be shown: "USDT" without a standard is the most expensive ambiguity in crypto payments. */
  standard: string;
  address: string;
  feeHint: string;
};

export const NETWORKS: Network[] = [
  { id: "tron", label: "Tron", standard: "TRC-20", address: "TFb2CYgD7bkmRk3WBVQyQA137EwEhkgsYX", feeHint: "laagste kosten" },
  { id: "bsc", label: "BNB Chain", standard: "BEP-20", address: "0xda9A2212E2af1446639A04BF462382134E0B3A52", feeHint: "lage kosten" },
  { id: "solana", label: "Solana", standard: "SPL", address: "G6XQpt8QDotJEjeU7xdr5yE5i8ba2QrXuPg85KvYQ5QY", feeHint: "lage kosten" },
  { id: "ethereum", label: "Ethereum", standard: "ERC-20", address: "0xda9A2212E2af1446639A04BF462382134E0B3A52", feeHint: "duurste — alleen als het moet" },
];

export function getNetwork(id: string): Network | undefined {
  return NETWORKS.find((n) => n.id === id);
}

/** Explorer link for a transaction, so an admin verifies against the chain instead of the screenshot. */
export function explorerTxUrl(networkId: string, txHash: string): string | null {
  const clean = txHash.trim().replace(/^0x/i, "");
  switch (networkId) {
    case "tron": return `https://tronscan.org/#/transaction/${clean}`;
    case "ethereum": return `https://etherscan.io/tx/0x${clean}`;
    case "bsc": return `https://bscscan.com/tx/0x${clean}`;
    case "solana": return `https://solscan.io/tx/${txHash.trim()}`;
    default: return null;
  }
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(value: string): Buffer | null {
  let num = BigInt(0);
  for (const ch of value) {
    const i = B58.indexOf(ch);
    if (i < 0) return null;
    num = num * BigInt(58) + BigInt(i);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  let zeros = 0;
  for (const ch of value) {
    if (ch === "1") zeros++;
    else break;
  }
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(hex, "hex")]);
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest();

/**
 * Validates a payout address. Deliberately strict: a prize sent to a malformed
 * address is gone with no recourse, so an address the player has to retype is
 * by far the cheaper outcome.
 */
export function validateAddress(networkId: string, addressInput: string): string | null {
  const address = addressInput.trim();
  if (!address) return "Vul een adres in.";

  if (networkId === "ethereum" || networkId === "bsc") {
    return /^0x[0-9a-fA-F]{40}$/.test(address)
      ? null
      : "Een Ethereum- of BNB-adres begint met 0x en heeft daarna 40 tekens.";
  }
  if (networkId === "tron") {
    const decoded = base58Decode(address);
    if (!decoded || decoded.length !== 25 || decoded[0] !== 0x41) {
      return "Een Tron-adres begint met een T en is 34 tekens lang.";
    }
    const payload = decoded.subarray(0, 21);
    return sha256(sha256(payload)).subarray(0, 4).equals(decoded.subarray(21))
      ? null
      : "Dit Tron-adres klopt niet — controleer of je het volledig hebt overgenomen.";
  }
  if (networkId === "solana") {
    const decoded = base58Decode(address);
    return decoded && decoded.length === 32
      ? null
      : "Een Solana-adres is 32 bytes in base58 (meestal 43 of 44 tekens).";
  }
  return "Onbekend netwerk.";
}
