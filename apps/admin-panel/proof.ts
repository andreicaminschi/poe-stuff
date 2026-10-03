import { createHash, createPublicKey, verify } from "node:crypto";
import { canonicalJson } from "./canonical-json.ts";
import type { Command } from "./commands.ts";
import { PROOF_TYPE, PROOF_WINDOW_SECONDS, type ProofHeader, type ProofPayload, type PublicJwk } from "./proof-format.ts";

export type VerifiedProof = {
  readonly actor: string;
  readonly jti: string;
  readonly iat: number;
};

/** Hashes text as base64url SHA-256. Low, Sonar 0. */
const hashText = (text: string): string => createHash("sha256").update(text).digest("base64url");

/** Reads one base64url JSON segment of a JWS. Low, Sonar 0. */
const readSegment = <T>(segment: string | undefined): T => JSON.parse(Buffer.from(segment ?? "", "base64url").toString("utf8")) as T;

/** Computes the RFC 7638 thumbprint of a P-256 public key. Low, Sonar 0. */
export const thumbprintJwk = (jwk: PublicJwk): string =>
  hashText(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }));

/** Reads the public key a proof was signed with. Low, Sonar 0. */
export const readProofJwk = (proof: string): PublicJwk => readSegment<ProofHeader>(proof.split(".")[0]).jwk;

/** Checks an ES256 signature over `header.payload` with the header's own key. Low, Sonar 0. */
function checkSignature(proof: string, jwk: PublicJwk): boolean {
  const [header, payload, signature] = proof.split(".");
  const key = createPublicKey({ key: { ...jwk }, format: "jwk" });

  return verify("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(signature ?? "", "base64url"));
}

/**
 * Verifies a command's proof and returns who sent it. Throws at the first failed check: the
 * header, the signature, the command hash, the time window, a replayed `jti`, then whether the
 * key is the user's. `seenJtis` maps each spent `jti` to its `iat`. Low, Sonar 6.
 */
export function verifyProof(
  proof: string,
  command: Command,
  userJkt: string,
  seenJtis: ReadonlyMap<string, number>,
  now: number,
): VerifiedProof {
  const [headerSegment, payloadSegment] = proof.split(".");
  const header = readSegment<ProofHeader>(headerSegment);
  const payload = readSegment<ProofPayload>(payloadSegment);

  if (header.typ !== PROOF_TYPE || header.alg !== "ES256") throw new Error("Proof refused: wrong typ or alg.");
  if (!checkSignature(proof, header.jwk)) throw new Error("Proof refused: bad signature.");
  if (payload.cmd !== command.type || payload.chash !== hashText(canonicalJson(command))) throw new Error("Proof refused: chash mismatch.");
  if (Math.abs(now - payload.iat) > PROOF_WINDOW_SECONDS) throw new Error("Proof refused: iat outside the window.");
  if (seenJtis.has(payload.jti)) throw new Error("Proof refused: jti replayed.");

  const actor = thumbprintJwk(header.jwk);

  if (actor !== userJkt) throw new Error("Proof refused: key is not the user's.");

  return { actor, jti: payload.jti, iat: payload.iat };
}
