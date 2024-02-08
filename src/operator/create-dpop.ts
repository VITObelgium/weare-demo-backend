import { createHash, generateKeyPairSync } from "crypto";
import jwt from 'jsonwebtoken';

import * as pemJwk from 'pem-jwk';
import { v4 } from "uuid";

export let DPOP_KEY = {
    privateKey: 'your-private-key',
    publicKey: {
        kty: 'key type',
        n: 'modulus',
        e: 'exponent',
    },
};


export async function initializeDPoP () {
    console.log("Creating Public/Private key pair");

    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        },
    });

    DPOP_KEY.privateKey = privateKey;

    // Extract public key information in JWK format
    const jwk = pemJwk.pem2jwk(publicKey);

    DPOP_KEY.publicKey = {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
    };
};


export async function createDPoPProof (httpMethod: string, url: string, body: string | null): Promise<string> {
    const header = {
        alg: 'RS512',
        jwk: {
            ...DPOP_KEY.publicKey,
            use: 'sig',
        },
        typ: 'dpop+jwt',
    };

    const payload = {
        htu: url,
        htm: httpMethod,
        jti: v4(),
    };

    // Use the private key for signing
    return jwt.sign(payload, DPOP_KEY.privateKey, { header : header });
}

/*
export async function createDPoP(uri: string, method: string) {
    const { privateJwk, privateKey, publicJwk } = (await extractJwksJson(DPOP_KEY.publicKey))[0];

    if (!privateJwk.alg) throw new Error("No algorithm found in private JWK");

    const dpopProof = await new SignJWT({
        htm: method,
        htu: uri,
    })
        .setProtectedHeader({
            alg: privateJwk.alg,
            typ: "dpop+jwt",
            jwk: publicJwk,
        })
        .setJti(v4())
        .setIssuedAt()
        .sign(privateKey);

    return dpopProof;
}
*/