import { canonicalJson } from "../canonical-json.ts";
import type { Command } from "../commands.ts";
import { PROOF_TYPE, type ProofHeader, type ProofPayload, type PublicJwk } from "../proof-format.ts";

/** Encodes bytes as base64url without padding. Low, Sonar 0. */
const encodeBytes = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

/** Encodes text as base64url. Low, Sonar 0. */
const encodeText = (text: string): string => encodeBytes(new TextEncoder().encode(text));

/** Hashes text as base64url SHA-256. Low, Sonar 0. */
const hashText = async (text: string): Promise<string> =>
  encodeBytes(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));

/** Signs one command as a compact JWS proof, with the public key in its header. Low, Sonar 0. */
export async function signProof(keys: CryptoKeyPair, command: Command): Promise<string> {
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", keys.publicKey);
  const header: ProofHeader = { typ: PROOF_TYPE, alg: "ES256", jwk: { kty, crv, x, y } as PublicJwk };
  const payload: ProofPayload = {
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    cmd: command.type,
    chash: await hashText(canonicalJson(command)),
  };
  const signingInput = `${encodeText(JSON.stringify(header))}.${encodeText(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, new TextEncoder().encode(signingInput));

  return `${signingInput}.${encodeBytes(new Uint8Array(signature))}`;
}
