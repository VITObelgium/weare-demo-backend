//
// Copyright 2023 VITO
//
import { getSessionFromStorage, Session as SolidSession } from "@inrupt/solid-client-authn-node";
import { Express } from "express";
import {
    getPodUrlAll,
} from "@inrupt/solid-client";
import axios from "axios";
import log from "loglevel";
import { GenericStore } from "@weare/weare-libs";
import { HttpError } from "@weare/weare-libs";

export default function createVcEndpoints(app: Express) {
  // @ts-ignore
  app.get("/access-request", async (req, res, next) => {
    try {
      log.debug("Calling access-request");
      const { redirectUrl, podRelativeUrl, questionnaireIri } = req.query;

      if (redirectUrl !== undefined && redirectUrl !== "" && podRelativeUrl !== undefined && podRelativeUrl !== "") {
        if(!req.session) {
          console.log("No session found")
          next(
              new HttpError(
                  `No session found.`,
                  401
              )
          );
        }
        const session = await getSessionFromStorage(req.session!.solidSessionId!);
        if(!session) {
            console.log("No Solid Session found")
            next(
                new HttpError(
                    `No Solid Session found.`,
                    401
                )
            );
        }
        const webId = session!.info.webId;

        if (!podRelativeUrl) {
          const message = `To read a resource from the user's Pod we require the query param [podRelativeUrl] to tell us the relative path to read the resource from, but we received no value.`;
          log.error(message);
          res.status(400).send(message);
          return;
        }

        if (!questionnaireIri) {
          const message = `To read a resource from the user's Pod we require the query param [questionnaireIri] to tell us the questionnaire to use, but we received no value.`;
          log.error(message);
          res.status(400).send(message);
          return;
        }

        const questionnaireStore = new GenericStore();
        await questionnaireStore.initialize(
          [
            (questionnaireIri as string).replace("localhost", "host.docker.internal"), // In a Docker container we need to query host.docker.internal and not localhost to reach the host service.
          ],
          process.env.WEARE_SERVICES_BACKEND_API_KEY!
        );

        let purpose = questionnaireStore.getNamedNodeIri(questionnaireIri as string, "dpv:RequestedServiceProvision");
        
        const myPods = await getPodUrlAll(webId!);
        const dataIri = `${myPods![0]}${podRelativeUrl.toString()}`;

        const clientId = process.env.WEARE_SERVICES_BACKEND_CLIENT_ID!;
        const clientSecret = process.env.WEARE_SERVICES_BACKEND_CLIENT_SECRET!;
        const base64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const requestUrl = process.env.WEARE_SERVICES_BACKEND! + process.env.WEARE_SERVICES_BACKEND_API_AR_PATH!;
        try {
          // Set header X-WA-Key to api key
          const options = {
            method: "POST",
            url: requestUrl,
            headers: {
              "content-type": "application/json",
              "X-WA-Key": process.env.WEARE_SERVICES_BACKEND_API_KEY,
              Authorization: `Basic ${base64}`,
            },
            data: {
              dataIri,
              ownerWebId: webId,
              requestorWebId: process.env.PREM_PROCESSOR_WEBID,
              redirectUrl,
              purpose,
            },
            maxRedirects: 0,
            validateStatus(innerStatus: number) {
              return innerStatus >= 200 && innerStatus <= 302;
            },
          };
          const response = await axios.request(options);
          res.location(response.headers.location);
          res.sendStatus(302);
          return;
        } catch (err) {
          const message = `Failed to POST to [${requestUrl}]. Error: ${err}`;
          log.error(message);
          res.status(500).send(`<p>Internal Server Error: ${message}</p>`);
        }
      } else {
        res.status(400).send("Missing request parameters redirectUrl, resource");
      }
    } catch (error) {
      // A general error catcher which will, in turn, call the ExpressJS error handler.
      next(error);
    }
  });
}
