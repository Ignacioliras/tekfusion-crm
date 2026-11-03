import type { SupabaseClient } from "@supabase/supabase-js";

import type { RAFile } from "../../types";
import { ATTACHMENTS_BUCKET } from "../commons/attachments";

// The attachments bucket is private (docs/08, Fase 2): a stored `src` is the
// bucket's public URL, which no longer serves anything, so every read swaps it
// for a signed URL that lasts an hour. Which files a user may sign is the
// attachments_select policy (supabase/schemas/11_tekfusion_policies.sql).

/** docs/08: signed URLs of 60 minutes. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
const RENEW_MARGIN_MS = 5 * 60 * 1000;

/** The bucket path a stored src points at, or undefined for an external URL. */
export const bucketPathFromUrl = (
  src: string | null | undefined,
  bucket = ATTACHMENTS_BUCKET,
): string | undefined => {
  if (!src) return undefined;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = src.indexOf(marker);
  if (index < 0) return undefined;
  const path = src.slice(index + marker.length).split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

type FileLike = Pick<RAFile, "src" | "path"> | null | undefined;

const fileBucketPath = (file: FileLike): string | undefined =>
  file?.path || bucketPathFromUrl(file?.src);

/** Signs bucket paths; a path the user may not read is left out of the map. */
export type Signer = (paths: string[]) => Promise<Map<string, string>>;

/**
 * The record with the files in `fields` (a file or a list of files) pointing
 * at signed URLs. External files (a Gravatar avatar) are left untouched.
 */
export const signRecordFiles = async <T extends Record<string, any>>(
  record: T,
  fields: string[],
  sign: Signer,
): Promise<T> => {
  const paths = fields.flatMap((field) =>
    toList(record[field])
      .map(fileBucketPath)
      .filter((path): path is string => path !== undefined),
  );
  if (paths.length === 0) return record;
  const urls = await sign([...new Set(paths)]);
  const withSignedUrl = (file: RAFile): RAFile => {
    const path = fileBucketPath(file);
    const url = path && urls.get(path);
    return url ? { ...file, path, src: url } : file;
  };
  const signed = { ...record };
  for (const field of fields) {
    const value = record[field];
    if (Array.isArray(value)) {
      (signed as Record<string, any>)[field] = value.map(withSignedUrl);
    } else if (value) {
      (signed as Record<string, any>)[field] = withSignedUrl(value);
    }
  }
  return signed;
};

/** A stored URL string (the configuration logos) as a signed URL, or as is. */
export const signUrl = async (src: string, sign: Signer): Promise<string> => {
  const path = bucketPathFromUrl(src);
  if (!path) return src;
  return (await sign([path])).get(path) ?? src;
};

const toList = (value: unknown): RAFile[] =>
  Array.isArray(value) ? value : value ? [value as RAFile] : [];

/**
 * Signs through Supabase Storage, remembering each URL until five minutes
 * before it expires so a refetch of a list does not sign everything again.
 */
export const createSigner = (
  client: SupabaseClient,
  bucket = ATTACHMENTS_BUCKET,
): Signer => {
  const cache = new Map<string, { url: string; expiresAt: number }>();
  return async (paths) => {
    const now = Date.now();
    const urls = new Map<string, string>();
    const missing: string[] = [];
    for (const path of paths) {
      const hit = cache.get(path);
      if (hit && hit.expiresAt - RENEW_MARGIN_MS > now) urls.set(path, hit.url);
      else missing.push(path);
    }
    if (missing.length === 0) return urls;
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      console.error("createSignedUrls", error);
      return urls;
    }
    for (const item of data) {
      // A file the policy refuses comes back with an error and no URL.
      if (!item.path || !item.signedUrl) continue;
      cache.set(item.path, {
        url: item.signedUrl,
        expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
      });
      urls.set(item.path, item.signedUrl);
    }
    return urls;
  };
};
