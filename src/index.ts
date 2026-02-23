/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting, you can see "Raw usage" from the documentation.
 * 
 * See: https://docs.colyseus.io/server
 */
import { listen } from "@colyseus/tools";
import app from "./app.config.js";

const port = Number(process.env.PORT || 8080);

console.log("Starting Colyseus on port:", port);

listen(app, port);
