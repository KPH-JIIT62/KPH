const base = "http://localhost:5000";
const headers = { "Content-Type": "application/json", "X-User-Id": "u-saurav" };

async function main() {
  const home = await fetch(`${base}/`);
  const html = await home.text();
  if (!html.includes("Coding Hub")) throw new Error("home missing title");
  if (!html.includes("/assets/")) throw new Error("home missing assets");
  const boot = await fetch(`${base}/api/bootstrap`, { headers }).then((response) => response.json());
  if (boot.me.name !== "Saurav Raj") throw new Error("wrong user");
  const msgs = await fetch(`${base}/api/channels/ch-problems/messages`, { headers }).then((response) => response.json());
  const problem = msgs.messages.find((message) => message.id === "m-prob-1901");
  if (!problem || problem.replyCount !== 7) throw new Error(`thread count ${problem?.replyCount}`);
  const png = await fetch(`${base}/uploads/wa-pretest2.png`);
  const buf = Buffer.from(await png.arrayBuffer());
  if (buf[0] !== 137) throw new Error("png");
  const asset = html.match(/assets\/index-[^"']+\.js/)[0];
  const js = await fetch(`${base}/${asset}`);
  if (!js.ok) throw new Error(`js asset ${js.status}`);
  const css = html.match(/assets\/index-[^"']+\.css/)[0];
  const style = await fetch(`${base}/${css}`);
  if (!style.ok) throw new Error(`css asset ${style.status}`);
  const search = await fetch(`${base}/api/search?q=binary%20search`, { headers }).then((response) => response.json());
  if (!search.files.length || !search.messages.length) throw new Error("search empty");
  const denied = await fetch(`${base}/api/messages/m-prob-dp/pin`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pinned: true }),
  });
  if (denied.status !== 403) throw new Error(`pin status ${denied.status}`);
  console.log(`http ok ${boot.channels.length} channels, ${msgs.messages.length} problem messages`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
