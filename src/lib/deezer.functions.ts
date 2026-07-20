import { createServerFn } from "@tanstack/react-start";

export const fetchDeezerCoverByISRC = createServerFn({ method: "GET" })
  .inputValidator((data: { isrc: string }) => {
    if (!data?.isrc || typeof data.isrc !== "string") throw new Error("ISRC requerido");
    return { isrc: data.isrc.trim().toUpperCase() };
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.deezer.com/track/isrc:${encodeURIComponent(data.isrc)}`);
    if (!res.ok) throw new Error(`Deezer respondió ${res.status}`);
    const track = (await res.json()) as {
      error?: { message?: string };
      title?: string;
      artist?: { name?: string };
      album?: { title?: string; cover_xl?: string; cover_big?: string; cover_medium?: string };
    };
    if (track.error) throw new Error(track.error.message || "No se encontró el ISRC en Deezer");
    const coverUrl = track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium;
    if (!coverUrl) throw new Error("Deezer no devolvió carátula para este ISRC");
    const imgRes = await fetch(coverUrl);
    if (!imgRes.ok) throw new Error(`No se pudo descargar la imagen (${imgRes.status})`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    // Base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return {
      base64,
      contentType,
      title: track.title ?? null,
      artist: track.artist?.name ?? null,
      album: track.album?.title ?? null,
    };
  });