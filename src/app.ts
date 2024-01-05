import express, { Application, Request, Response } from 'express';
import { createSessionEndpoints } from "./create-session-endpoints";
import createVcEndpoints from "./create-vc-endpoints";
import cookieSession from "cookie-session";
import * as dotEnv from "dotenv";
import { errorHandler, initPrefixes } from '@weare/weare-libs';
import { createPodEndpoints } from './create-pod-endpoints';
import bodyParser from 'body-parser';

dotEnv.config();
initPrefixes();

const app = express();
const PORT = process.env.PORT;

const cors = require("cors");

app.use(
  cookieSession({
    name: "session",
    // These keys are required by cookie-session to sign the cookies.
    keys: [
      "Required, but value not relevant for this demo - key1",
      "Required, but value not relevant for this demo - key2",
    ],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

app.use(
  cors({
    origin: `${process.env.FRONTEND_PROTOCOL}://${process.env.FRONTEND_HOST}`,
    credentials: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use('health-check', (req: Request, res: Response): void => {
  res.send('Demo We Are Backend is up and running!');
});

createSessionEndpoints(app);
createPodEndpoints(app);
createVcEndpoints(app);
// Use ErrorHandler just before app.listen, should be the last middleware
app.use(errorHandler);

app.listen(PORT, (): void => {
  console.log('SERVER IS UP ON PORT:', PORT);
});