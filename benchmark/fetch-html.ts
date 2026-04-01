/**
 * Fetch raw HTML from a URL and save it locally for benchmarking.
 * Usage: bun run fetch-html.ts [url]
 */

const url =
  process.argv[2] ||
  "https://www.americanas.com.br/celular-samsung-galaxy-a17-com-ia--128gb--4gb-ram--camera-de-50mp--tela-de-6-7---nfc--ip54--cinza/p";

console.log(`Fetching: ${url}`);

const response = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  redirect: "follow",
});

if (!response.ok) {
  console.error(`HTTP ${response.status} ${response.statusText}`);
  process.exit(1);
}

const html = await response.text();
const outPath = import.meta.dir + "/sample.html";
await Bun.write(outPath, html);

console.log(`Saved ${html.length} chars (${Buffer.byteLength(html, "utf-8")} bytes) to sample.html`);
