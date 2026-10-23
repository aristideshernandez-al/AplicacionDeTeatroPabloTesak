import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReportAssetUrl } from "../lib/report-asset-proxy";

const bucket = "teatropablotesak-78d51.firebasestorage.app";

test("acepta enlaces de descarga tokenizados de evidencias de actividad", () => {
  const url = validateReportAssetUrl(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/activities%2Fabc%2Fphotos%2Ffoto.jpg?alt=media&token=token-de-prueba`,
    bucket,
  );
  assert.equal(url.hostname, "firebasestorage.googleapis.com");
});

test("rechaza destinos externos, otros buckets y enlaces sin token", () => {
  const rejected = [
    "https://example.com/file.jpg?alt=media&token=x",
    `https://firebasestorage.googleapis.com/v0/b/otro-bucket/o/activities%2Fabc%2Ffoto.jpg?alt=media&token=x`,
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/activities%2Fabc%2Ffoto.jpg?alt=media`,
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/users%2Fabc%2Fprivate.jpg?alt=media&token=x`,
  ];
  for (const value of rejected) {
    assert.throws(() => validateReportAssetUrl(value, bucket));
  }
});
