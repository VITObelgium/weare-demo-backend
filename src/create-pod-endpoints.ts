import { getSessionFromStorage, Session as SolidSession } from "@inrupt/solid-client-authn-node";
import { Express } from "express";
import {
    getSolidDataset,
    toRdfJsDataset,
    getPodUrlAll,
} from "@inrupt/solid-client";
import { fetchAuthenticatedSession, fetchPods, HttpError, serializeDatasetAsTurtle } from "@weare/weare-libs";
import {Parser, Store as N3Store} from "n3";
import { writeTriples } from "./operator/pod-operator";
export function createPodEndpoints(app: Express) {

    app.get("/pods", async (req, res, next) => {
        console.log("Getting pods")
        try {
            if(req.session!== undefined) {
                const session = await getSessionFromStorage(req.session!.solidSessionId);
                const webID = session!.info.webId;
                const myPods = await getPodUrlAll(webID!);
                res.send(myPods);
            } else {
                console.log("No session found")
                throw new Error("No session found!")
            }
        } catch (error) {
            // A general error catcher which will, in turn, call the ExpressJS error handler.
            console.log(error);
            next(error);
        }
    });

    app.get("/read",  async (req, res, next) => {
        try {
            console.log("Endpoint '/read' called...");

            const relativeResourceUrl = req.query.relativeResourceUrl;
            if (!relativeResourceUrl) {
                next(
                    new HttpError(
                        `To read a resource from the user's Pod we require the query param [podRelativeUrl] to tell us the relative path to read the resource from, but we received no value.`,
                        400
                    )
                );
                return;
            }

            if(!req.session) {
                console.log("No session found")
                next(
                    new HttpError(
                        `No session found.`,
                        401
                    )
                );
            }
            const session = await getSessionFromStorage(req.session!.solidSessionId);
            if(!session) {
                console.log("No Solid Session found")
                next(
                    new HttpError(
                        `No Solid Session found.`,
                        401
                    )
                );
            }
            const webID = session!.info.webId;
            const myPods = await getPodUrlAll(webID!);
            const userPodResourceUrl = `${myPods![0]}${relativeResourceUrl}`;

            console.log(`Getting Solid Dataset at [${userPodResourceUrl}]`)
            const solidDataset = await getSolidDataset(userPodResourceUrl.toString(), {fetch: session!.fetch});
            if (!solidDataset) {
                console.debug("No information present, sending an empty dataset");
                res.send("");
                return;
            }
            const dataset = toRdfJsDataset(solidDataset);
            const n3Store = new N3Store();
            n3Store.addQuads([...dataset]);
            const turtle = await serializeDatasetAsTurtle(n3Store);

            console.debug(
                `{ "response": "SUCCESSFULLY read resource [${userPodResourceUrl.toString()}] for user logged in with WebID [${webID}]." }`
            );
            res.send(turtle);
        } catch (error) {
            next(error);
        }
    });

    app.post("/write", async (req, res, next) => {
        console.debug("Endpoint '/write' called...");
       
        const relativeResourceUrl = req.query.relativeResourceUrl;
        if (!relativeResourceUrl) {
            next(
                new HttpError(
                    `To read a resource from the user's Pod we require the query param [podRelativeUrl] to tell us the relative path to read the resource from, but we received no value.`,
                    400
                )
            );
            return;
        }

        if(!req.session) {
            console.log("No session found")
            next(
                new HttpError(
                    `No session found.`,
                    401
                )
            );
        }
        const session = await getSessionFromStorage(req.session!.solidSessionId);
        if(!session) {
            console.log("No Solid Session found")
            next(
                new HttpError(
                    `No Solid Session found.`,
                    401
                )
            );
        }
        const webID = session!.info.webId;
        //build full url
        const myPods = await getPodUrlAll(webID!);
        const userPodResourceUrl = `${myPods![0]}${relativeResourceUrl}`;

        const payload = req.body;
        console.log(payload);
        const parser = new Parser();
        const quads = parser.parse(payload);

        const dataset = new N3Store();
        dataset.addQuads(quads);

        console.debug(
            `Overwriting resource relative to the first Pod (of [${myPods?.length}]) we found in user's WebID Profile Document: [${userPodResourceUrl}].`
        );

        writeTriples(session!, new URL(userPodResourceUrl), dataset).then((result) => {
            const messageAsJson = `{ "response": "SUCCESSFULLY wrote resource to [${userPodResourceUrl}] (that we parsed and found [${
                dataset.size
            }] triples) using the first registered Pod we found [${
                myPods![0]
            }] for user logged in with WebID [${webID}]." }`;
            console.debug(messageAsJson);
            res.send(messageAsJson);
        }).catch((error) => {
            const message = `Error writing triples to Pod: ${error}`;
            const httpError = new HttpError(message, 500);
            httpError.stack = error.stack;
            next(httpError);
        });
    });


}