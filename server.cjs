const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer(async(req, res) => {
    if(req.url === "/api/tide"){
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      try{
        const key = process.env.DATA_GO_KR_KEY || process.env.DATA_FO_KR_KEY;
        if (!key) {
          res.statusCode = 500;
          res.end(JSON.stringify({
            message: "DATA_GO_KR_KEY 환경변수에 공공데이터포털 인증키를 설정한 뒤 서버를 다시 실행하세요.",
          }));
          return;
        }

        const url = new URL(
          "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService"
        );

        url.search = new URLSearchParams({
          serviceKey: decodeURIComponent(key),
          obsCode: "DT_0018",
          reqDate: new Date()
            .toLocaleDateString("sv-SE", { timeZone : "Asia/Seoul"})
            .replaceAll("-",""),
          type: "json",
        }).toString();

        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();

        if(!response.ok || data.header?.resultCode !=="00"){
          throw new Error("조석예보 조회에 실패했습니다.");
        }

        res.end(JSON.stringify(data));
      } catch{
        res.statusCode = 500;
        res.end(JSON.stringify({
          message : "조석예보를 받지 못했습니다. 인증키와 활용신청을 확인하세요.",
        }));
      }
      return;
    }
    let relative;
    try {
      relative = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (relative === "/" ? "/index.html" : relative),
    );
    const extension = path.extname(file);
    if (
      !file.startsWith(root + path.sep) ||
      !types[extension] ||
      relative.includes("/.")
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, bytes) => {
      if (err) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[extension],
        "Cache-Control": "no-store",
      });
      res.end(bytes);
    });
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("낚시꾸니: http://127.0.0.1:4173"),
  );
