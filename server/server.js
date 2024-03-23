const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const config = JSON.parse(fs.readFileSync("./data/ports.json", "utf8"));

const host = config.ip;
const port = config.serverPort;

const scripts = {
    load_accept: require("./load_accept"),
    load_prob: require("./load_prob")
};

/**
 * 
 * @param {string} an 
 * @param {http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}} res 
 * @param {import("querystring").ParsedUrlQuery & string} query 
 */
function load_api(an, res, query) {
    switch (an) {
        case "load":
            return scripts.load_accept(query.uid, query.client, res);
    }
}

/**
 * 
 * @param {string} fn 
 * @param {http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}} res 
 * @param {string} fld 
 * @param {string} ctt 
 */
function load_file(fn, res, fld, ctt) {
    fs.readFile("./" + fld + fn, (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end(`Error: ${err.code}`);
        }
        res.writeHead(200, {
            "Content-Type": ctt
        });
        res.end(data, "utf-8");
    });
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}} res 
 */
function load(req, res) {
    fs.appendFile("./logs/server.log", `[${Date.now()}] ${req.url}\n`, () => {
        let url = req.url.replace(/client=\w+/, "client=***");
        console.log(`[${Date.now()}] ${url}`);
    });
    const parsed = url.parse(req.url, true);
    const filePath = parsed.pathname == "/" ? "/index.html" : parsed.pathname;
    if (filePath.startsWith("/api/")) {
        return load_api(filePath.substring(5), res, parsed.query);
    }
    const extname = path.extname(filePath).toLowerCase();
    const ctt = {
        ".css": "text/css",
        ".html": "text/html",
        ".ico": "image/x-icon",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".js": "application/javascript",
        ".json": "text/plain",
        ".png": "image/png",
    };
    const fld = {
        ".css": "styles",
        ".html": "pages",
        ".ico": "pics",
        ".jpeg": "pics",
        ".jpg": "pics",
        ".js": "scripts",
        ".json": "data",
        ".png": "pics",
    }
    load_file(filePath, res, fld[extname], ctt[extname]);
}

const server = http.createServer(load);

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});

const ws_port = config.socketPort;

const wss = new WebSocket.Server({ port: ws_port });

wss.on("connection", (ws, req) => {
    // Web Socket is used only in the following situations:
    //
    // 1. Updating progress bar data of fetching problemset (send-only)

    const parsed = url.parse(req.url, true);
    const type = parsed.query["type"];
    fs.appendFile("./logs/server.log", `[${Date.now()}] WebSocket: ${type}\n`, () => {
        console.log(`[${Date.now()}] ${type}`);
    });
    switch (type) {
        case "load_prob":
            return scripts.load_prob(parsed.query["body"], ws);
    }
});
