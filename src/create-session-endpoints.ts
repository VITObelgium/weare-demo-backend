import { getSessionFromStorage, Session as SolidSession } from "@inrupt/solid-client-authn-node";
import { Express } from "express";
import axios from 'axios';
import { getPodUrlAll } from "@inrupt/solid-client";
import { createDPoPProof, initializeDPoP } from "./operator/create-dpop";
import { requestAccessToken } from "./operator/create-access-token";
import { createVCFetch } from "./operator/create-fetch";
import {
    issueAccessRequest as issueAccessRequestInrupt,
} from "@inrupt/solid-client-access-grants";



function getRedirectUrlByQueryParameterOrDefault(
    loginSuccessful: boolean = true
): string {
    let redirectUrlAfterLogin;
    redirectUrlAfterLogin = `${process.env.FRONTEND_PROTOCOL}://${process.env.FRONTEND_HOST}`;

    const url = new URL(redirectUrlAfterLogin);
    url.searchParams.set("login", `${loginSuccessful ? "Success" : "Error"}`);
    redirectUrlAfterLogin = url.toString();

    return redirectUrlAfterLogin;
}


export function createSessionEndpoints(app: Express) {

    initializeDPoP();

    app.get("/auth-backend", async (req, res, next) => {
        try {
            const accessTokenInfo = await requestAccessToken();
            console.log('Token Response:', accessTokenInfo);
            res.send(accessTokenInfo)

        } catch (error) {
            console.error('Error obtaining token:', (error as any).response ? (error as any).response.data : (error as any).message);
            next(error);
        }
    });

    app.get("/login", async (req, res, next) => {
        try {
            const oidcRedirectUrl = `${process.env.PROTOCOL}://${process.env.HOST}${process.env.OIDC_REDIRECT_PATH}`;

            const session = new SolidSession();
            console.log("Setting solidSessionId");
            req.session!.solidSessionId = session.info.sessionId;
            const redirectToSolidIdentityProvider = (url: string) => {
                res.redirect(url);
            };

            await session.login({
                redirectUrl: oidcRedirectUrl,
                oidcIssuer: process.env.OIDC_ISSUER_URL,
                clientId: process.env.OIDC_CLIENT_ID,
                handleRedirect: redirectToSolidIdentityProvider,
            });
        } catch (error) {
            // A general error catcher which will, in turn, call the ExpressJS error handler.
            next(error);
        }
    });

    app.get("/oidc-redirect", async (req, res, next) => {
        try {

            const session = await getSessionFromStorage(req.session!.solidSessionId);
            console.log('################SESSION########################')
            console.log(session);
            console.log('################END SESSION########################')

            const fullUrl = `${process.env.PROTOCOL}://${req.get("host")}${req.originalUrl}`;

            console.log(fullUrl);

            await session!.handleIncomingRedirect(fullUrl);
            console.log("LOGGED IN");
            console.log(session!.info.isLoggedIn)

            if (session!.info.isLoggedIn) {
                let redirectUrl;
                let accessRequest;
                try {
                    redirectUrl = getRedirectUrlByQueryParameterOrDefault(
                        true
                    );

                    //CREATE ACCESS REQUEST
                    console.log("Creating access request for WE ARE DEMO BACKEND")
                    const webId = session!.info.webId;
                    const podRelativeUrl = "/weare/demo-backend/";
                    const purpose = "https://utils.prem-acc.vito.be/data/vocab/vpp/sharing/vpp-sharing-purpose#_VikzSharingPurpose"; // TODO

                    const myPods = await getPodUrlAll(webId!);
                    const dataIri = `${myPods![0]}${podRelativeUrl.toString()}`;

                    const accessExpiration = new Date(Date.now());
                    accessExpiration.setHours(23, 59, 59);

                    accessRequest = await issueAccessRequestInrupt(
                        {
                            access: { read: true, write: true, append: true },
                            purpose: [purpose],
                            resourceOwner: webId!,
                            resources: [dataIri],
                            expirationDate: accessExpiration,
                        },
                        {
                            accessEndpoint: process.env.ACCESS_REQUEST_ENDPOINT!,
                            fetch: createVCFetch,
                        }
                    );
                    console.log("######################################################################")
                    console.log(accessRequest);
                    console.log("######################################################################")

                    //We have an access request, now direct to approver with redirectURL = redirectUrl
                    //redirectUrl=

                } catch (error) {
                    next(error);
                    return;
                }
                res
                    .status(302)
                    .location(redirectUrl);
                res.end();
            }
        } catch (error) {
            // A general error catcher which will, in turn, call the ExpressJS error handler.
            next(error);
        }
    });

}