import {getSessionFromStorage, Session as SolidSession} from "@inrupt/solid-client-authn-node";
import {Express} from "express";
import axios from "axios";
import log from "loglevel";

export const CONFIG_QUERY_PARAM_OIDC_ISSUER_URL = "idp";
export const CONFIG_BACKEND_TO_CHOOSE_OIDC_ISSUER = "BackendToChooseOidcIssuer";

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
            const fullUrl = `${process.env.PROTOCOL}://${req.get("host")}${req.originalUrl}`;

            await session!.handleIncomingRedirect(fullUrl);

            if (session!.info.isLoggedIn) {
                let redirectUrl;
                try {
                    redirectUrl = getRedirectUrlByQueryParameterOrDefault(
                        true
                    );
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

    app.get("/access-token", async (req, res, next) => {
        console.debug("Endpoint '/access-token' called...");
        try {
            try {
                const options = {
                  method: "POST",
                  url: process.env.WEARE_IDP_BACKEND,
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                  },
                  data: {
                    grant_type: 'client_credentials',
                    client_id: process.env.WEARE_DEMO_BACKEND_CLIENT_ID,
                    client_secret: process.env.WEARE_DEMO_BACKEND_CLIENT_SECRET,
                  },
                };
                const response = await axios.request(options);
                // res.sendStatus(201);
                res.send(response.data!);
                return;
              } catch (err) {
                const message = `Failed to POST to [${process.env.WEARE_IDP_BACKEND}]. Error: ${err}`;
                log.error(message);
                res.status(500).send(`<p>Internal Server Error: ${message}</p>`);
              }
        } catch (error) {
            // A general error catcher which will, in turn, call the ExpressJS error handler.
            console.log(error);
            next(error);
        }
    });

}