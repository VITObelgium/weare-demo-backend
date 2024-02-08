import { createDPoPProof } from "./create-dpop";
import axios from 'axios';

export async function requestAccessToken(): Promise<any> {
    console.log("Fetching Access Token");
    try {
        const tokenEndpoint = `${process.env.WEARE_IDP}${process.env.TOKEN_PATH}`;

        const dpopProof = await createDPoPProof('POST', tokenEndpoint, null);

        const headers = {
            'DPoP': `${dpopProof}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        const body = `grant_type=client_credentials&client_id=${process.env.WE_ARE_DEMO_CLIENT_ID}&client_secret=${process.env.WE_ARE_DEMO_CLIENT_SECRET}`;

        try {
            const response = await axios.post(tokenEndpoint, body, { headers });
            return response.data;

        } catch (error) {
            console.error('Error obtaining token:', (error as any).response ? (error as any).response.data : (error as any).message);
            throw(error);
        }

    } catch (error) {
        console.error("Something else went wrong...")
        throw (error);
    }


};

