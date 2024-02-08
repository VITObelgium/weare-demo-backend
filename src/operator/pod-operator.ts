import { Session as SolidSession } from "@inrupt/solid-client-authn-node";
import {Store as N3Store} from "n3";
import log from "loglevel";
import {
    deleteFile,
    fromRdfJsDataset, getSolidDataset, overwriteFile,
    saveFileInContainer, toRdfJsDataset
} from "@inrupt/solid-client";
import {getVerifiableCredentialAllFromShape} from "@inrupt/solid-client-vc";
import { AccessGrant, deleteSolidDataset, saveSolidDatasetAt } from "@inrupt/solid-client-access-grants";
import { createVCFetch, createVCFetchDPoP } from "./create-fetch";


export async function writeTriplesWithAG(session: SolidSession, resourceUrl: URL, n3Store: N3Store, options?: {prefixes?: {}}): Promise<null | Error> {
    const resourceUrlStr = resourceUrl.toString();
    const solidDataset = fromRdfJsDataset(n3Store);

    console.log("####################ACCESS GRANT START ############")
    // Get Valid Access Grants
    const vcShape = {
        type: ["SolidAccessGrant"],
        credentialSubject: {
            providedConsent: {
                hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
            }
        },
    } as any; /* Validation fails for Partial<VerifiableCredential>, use any instead */
    vcShape.credentialSubject.id = session.info.webId;

    const accessGrants = (await getVerifiableCredentialAllFromShape(process.env.VC_DERIVE_ENDPOINT!, vcShape, {
        fetch: createVCFetch.bind(options),
    })) as AccessGrant[]; /* After filtering out the access grants we should be able to cast them here */
  
    if(accessGrants) {
        accessGrants.sort((a, b) => {
            // Handle cases where expirationDate might be undefined
            const dateA = a.expirationDate ? new Date(a.expirationDate) : new Date(0);
            const dateB = b.expirationDate ? new Date(b.expirationDate) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    
        const usableAccessGrant = accessGrants[accessGrants.length - 1];
        console.log("USABLE ACCESS GRANT #########################")
        console.log(usableAccessGrant)
        console.log("USABLE ACCESS GRANT #########################")

        return new Promise((resolve, reject) => {
            log.debug(`First, we attempting to remove old resource (ignoring errors in case it doesn't exist yet!)...`);
            deleteSolidDataset(resourceUrlStr, usableAccessGrant, {fetch: createVCFetch}).then(() => {
                saveSolidDatasetAt(resourceUrlStr, solidDataset, usableAccessGrant, {
                    fetch: createVCFetch
                }).then((response) => {
                    resolve(null);
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }
    return Error("No access grant found!");
    
};

export async function fetchAccessGrants(ownerWebId?: string): Promise<AccessGrant[]> {

    const vcShape = {
        type: ["SolidAccessGrant"],
        credentialSubject: {
            providedConsent: {
                hasStatus: "https://w3id.org/GConsent#ConsentStatusExplicitlyGiven",
            }
        },
    } as any; /* Validation fails for Partial<VerifiableCredential>, use any instead */

    if (ownerWebId) vcShape.credentialSubject.id = ownerWebId;


    const accessGrants = (await getVerifiableCredentialAllFromShape(process.env.VC_DERIVE_ENDPOINT!, vcShape, {
        fetch: createVCFetch,
    })) as AccessGrant[]; /* After filtering out the access grants we should be able to cast them here */
    return accessGrants;
}

export async function getTriples(session: SolidSession, resourceUrl: URL): Promise<N3Store> {
    const resourceUrlStr = resourceUrl.toString();

    const solidDataset = await getSolidDataset(resourceUrlStr, {fetch: session.fetch});
    const n3Store = new N3Store();
    const dataSet = toRdfJsDataset(solidDataset);
    n3Store.addQuads([...dataSet]);

    return n3Store;
};


export async function writeFile(session: SolidSession, containerUrl: URL, file: File): Promise<string | null> {
    const containerUrlStr = containerUrl.toString();

    return new Promise((resolve, reject) => {
        log.debug(`First, we attempting to remove old resource (ignoring errors in case it doesn't exist yet!)...`);
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        deleteFile(`${containerUrlStr}/${fileName}`, {fetch: session.fetch}).then(() => {
            overwriteFile(`${containerUrlStr}/${fileName}`, file, {
                fetch: session.fetch,
            }).then((response) => {
                resolve(null);
            }).catch((error) => {
                reject(error);
            });
        }).catch((error) => {
            saveFileInContainer(containerUrlStr, file, {
                fetch: session.fetch,
            }).then((response) => {
                resolve(null);
            }).catch((error) => {
                reject(error);
            });
        });
    });
};