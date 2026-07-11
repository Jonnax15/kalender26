// api/checks.js — Serverless API auf Vercel
export default async function handler(req, res) {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_FILE } = process.env;
  const BRANCH = "main"; // ggf. anpassen
  const base = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

  const gh = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.headers || {}),
      },
    });

  if (req.method === "GET") {
    const r = await gh(`${base}?ref=${BRANCH}`);
    if (r.status === 404) return res.status(200).json({ checks: {}, notes: {} });
    const data = await r.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    return res.status(200).json(JSON.parse(decoded));
  }

  async function readBody(req) {
    return await new Promise((resolve) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => resolve(body));
    });
  }

  if (req.method === "PUT") {
    const raw = await readBody(req);
    const { checks = {}, notes = {} } = JSON.parse(raw || "{}");

    let sha;
    const meta = await gh(`${base}?ref=${BRANCH}`);
    if (meta.ok) {
      const m = await meta.json();
      sha = m.sha;
    }

    const content = Buffer.from(
      JSON.stringify({ checks, notes }, null, 2)
    ).toString("base64");

    await gh(base, {
      method: "PUT",
      body: JSON.stringify({
        message: "Update checks+notes.json",
        content,
        branch: BRANCH,
        sha,
      }),
    });

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).end("Method Not Allowed");
}
