import { Session as SolidSession } from "@inrupt/solid-client-authn-node";
import {Store as N3Store} from "n3";
import log from "loglevel";
import {
    deleteFile,
    deleteSolidDataset,
    fromRdfJsDataset, getSolidDataset, overwriteFile,
    saveFileInContainer,
    saveSolidDatasetAt, toRdfJsDataset
} from "@inrupt/solid-client";

export async function writeTriples(session: SolidSession, resourceUrl: URL, n3Store: N3Store, options?: {prefixes?: {}}): Promise<null | Error> {
    const resourceUrlStr = resourceUrl.toString();
    const solidDataset = fromRdfJsDataset(n3Store);

    return new Promise((resolve, reject) => {
        log.debug(`First, we attempting to remove old resource (ignoring errors in case it doesn't exist yet!)...`);
        deleteSolidDataset(resourceUrlStr, {fetch: session.fetch}).then(() => {
            const prefixes = {
            ...globalThis.prefixes,
            ...options?.prefixes,
                    thisParent: resourceUrlStr.substring(0, resourceUrlStr.lastIndexOf("/") + 1),
                    this: `${resourceUrlStr}#`
            };
            saveSolidDatasetAt(resourceUrlStr, solidDataset, {
                fetch: session.fetch,
                prefixes
            }).then((response) => {
                resolve(null);
            }).catch((error) => {
                reject(error);
            });
        }).catch((error) => {
            reject(error);
        });
    });
};

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