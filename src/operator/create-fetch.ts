//
// Copyright 2023 VITO
//
import path from "path";
import fs from "fs";
import { fetch as crossFetch, Headers as CrossHeaders } from "cross-fetch";
import { JWK } from "jose";
import { createDPoPProof } from "./create-dpop";
import { requestAccessToken } from "./create-access-token";

export async function createVCFetch(requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> {
  const vcRequestInit = requestInit || {};
  vcRequestInit.method = vcRequestInit.method || "GET"; // Fallback to HTTP GET, needed for DPoP
  vcRequestInit.headers = new CrossHeaders(vcRequestInit.headers || {});


  const accessTokenInfo = await requestAccessToken();

  vcRequestInit.headers.append(
    "Authorization",
    `Bearer ${accessTokenInfo.access_token}`
  );
  /*const dpopProof = await createDPoPProof(requestInfo.toString(), vcRequestInit.method, null);

  vcRequestInit.headers.append("DPoP", dpopProof);
  console.log("###########################COMPLETE HEADER#############################################")
  console.log(vcRequestInit.headers)
  console.log("###########################DOPOPOPOPOP#############################################")
*/
  return crossFetch(requestInfo, vcRequestInit);
}

export async function createVCFetchDPoP(requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> {
  const vcRequestInit = requestInit || {};
  vcRequestInit.method = vcRequestInit.method || "GET"; // Fallback to HTTP GET, needed for DPoP
  vcRequestInit.headers = new CrossHeaders(vcRequestInit.headers || {});


  const accessTokenInfo = await requestAccessToken();

  vcRequestInit.headers.append(
    "Authorization",
    `DPoP ${accessTokenInfo.access_token}`
  );
  const dpopProof = await createDPoPProof(requestInfo.toString(), vcRequestInit.method, null);

  vcRequestInit.headers.append("DPoP", dpopProof);
  console.log("###########################COMPLETE HEADER#############################################")
  console.log(vcRequestInit.headers)
  console.log("###########################DOPOPOPOPOP#############################################")

  return crossFetch(requestInfo, vcRequestInit);
}



/*
export async function createACRFetch(requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> {
  // @ts-ignore
  return createVCFetch.bind(this)(requestInfo, requestInit);
}

export async function createResourceFetch(
  requestInfo: RequestInfo | URL,
  requestInit?: RequestInit
): Promise<Response> {
  const resourceRequestInit = requestInit || {};
  resourceRequestInit.method = resourceRequestInit.method || "GET"; // Fallback to HTTP GET, needed for DPoP
  // resourceRequestInit.method = 'HEAD'  // Try HEAD to get ACL details
  resourceRequestInit.headers = new CrossHeaders(resourceRequestInit.headers || {});

  // if (!resourceRequestInit.headers.get('Content-Type')) resourceRequestInit.headers.append('Content-Type', 'application/json') // Fallback to application/json
  // if (!resourceRequestInit.headers.get('Accept')) resourceRequestInit.headers.append('Accept', 'application/json') // Fallback to application/json
  const jwks = JSON.parse(fs.readFileSync(path.join(process.cwd(), process.env.JWKS_LOCATION!)).toString()) as {
    keys: Array<JWK>;
  };
  resourceRequestInit.headers.append(
    "Authorization",
    `DPoP ${await createAccessToken(
      jwks,
      // @ts-ignore
      this.webId,
      // @ts-ignore
      this.issuer,
      // @ts-ignore
      this.clientId
    )}`
  );
  resourceRequestInit.headers.append(
    "DPoP",
    await createDPoP(requestInfo.toString(), resourceRequestInit.method, jwks)
  );

  // Used to debug inner response for UMA call
  // const response = await crossFetch(requestInfo, resourceRequestInit)
  // const text = await response.text()

  return crossFetch(requestInfo, resourceRequestInit);
}

export async function createResourceFetchByAG(
  requestInfo: RequestInfo | URL,
  requestInit?: RequestInit
): Promise<Response> {
  const resourceRequestInit = requestInit || {};
  resourceRequestInit.method = resourceRequestInit.method || "GET"; // Fallback to HTTP GET, needed for DPoP
  resourceRequestInit.headers = new CrossHeaders(resourceRequestInit.headers || {});

  // if (!requestInit.headers.get('Content-Type')) requestInit.headers.append('Content-Type', 'application/json') // Fallback to application/json
  const jwks = JSON.parse(fs.readFileSync(path.join(process.cwd(), process.env.JWKS_LOCATION!)).toString()) as {
    keys: Array<JWK>;
  };
  resourceRequestInit.headers.append(
    "Authorization",
    `Bearer ${await createIDToken(
      jwks,
      // @ts-ignore
      this.webId,
      // @ts-ignore
      this.issuer,
      // @ts-ignore
      this.clientId,
      false
    )}`
  ); // Use Bearer for this one as dictated in the docs. DPoP does not seem to work.

  // Used to debug inner response for UMA call
  // const response = await crossFetch(requestInfo, requestInit)
  // const text = await response.text()

  return crossFetch(requestInfo, resourceRequestInit);
}

export async function createPodFetch(requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> {
  const podRequestInit = requestInit || {};
  podRequestInit.method = "POST"; // Use POST to create Pod
  podRequestInit.body = ""; // Don't send a body to create a Pod
  podRequestInit.headers = new CrossHeaders(podRequestInit.headers || {});

  const jwks = JSON.parse(fs.readFileSync(path.join(process.cwd(), process.env.JWKS_LOCATION!)).toString()) as {
    keys: Array<JWK>;
  };
  podRequestInit.headers.append(
    "Authorization",
    `DPoP ${await createAccessToken(
      jwks,
      // @ts-ignore
      this.webId,
      // @ts-ignore
      this.issuer,
      // @ts-ignore
      this.clientId
    )}`
  );
  podRequestInit.headers.append("DPoP", await createDPoP(requestInfo.toString(), podRequestInit.method, jwks));

  return crossFetch(requestInfo, podRequestInit);
}
*/
