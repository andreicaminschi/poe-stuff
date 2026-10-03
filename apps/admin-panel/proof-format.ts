export const PROOF_TYPE = "cmd+jwt";

export const PROOF_WINDOW_SECONDS = 60;

export type PublicJwk = {
  readonly kty: "EC";
  readonly crv: "P-256";
  readonly x: string;
  readonly y: string;
};

export type ProofHeader = {
  readonly typ: typeof PROOF_TYPE;
  readonly alg: "ES256";
  readonly jwk: PublicJwk;
};

export type ProofPayload = {
  readonly jti: string;
  readonly iat: number;
  readonly cmd: string;
  readonly chash: string;
};
