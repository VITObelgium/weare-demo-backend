import { getSessionFromStorage, Session as SolidSession } from "@inrupt/solid-client-authn-node";
import { Express } from "express";
import { NestedRedirectUrl } from "@weare/weare-libs";

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

    });

    app.get("/oidc-redirect", async (req, res, next) => {
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

    });

}