import { Redis } from "@upstash/redis";

const redis = new Redis({
  url:
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL,

  token:
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN,
});

const STORAGE_KEY = "holiday-calendar-2026";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  try {
    if (req.method === "GET") {
      const savedData = await redis.get(STORAGE_KEY);

      return res.status(200).json(
        savedData || {
          checks: {},
          notes: {},
        }
      );
    }

    if (req.method === "PUT") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body;

      const data = {
        checks: body?.checks || {},
        notes: body?.notes || {},
      };

      await redis.set(STORAGE_KEY, data);

      return res.status(200).json({
        success: true,
        data,
      });
    }

    return res.status(405).json({
      error: "Methode nicht erlaubt",
    });
  } catch (error) {
    console.error("Speicherfehler:", error);

    return res.status(500).json({
      error: "Daten konnten nicht gespeichert werden",
    });
  }
}
