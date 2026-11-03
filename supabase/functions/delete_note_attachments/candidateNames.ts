const MAX_CANDIDATES_PER_CALL = 100;

// The app uploads every file under the folder of its owner (deals/<id>,
// contacts/<id>, companies, sales, config), named `${Math.random()}${extension}`,
// e.g. `deals/12/0.8262106278726917.pdf`. Files Atomic left at the root still match.
const UPLOADED_FILE_NAME =
  /^(?:(?:deals|contacts|companies|sales|config)\/(?:[0-9]+\/)?)?0\.[0-9]+(\.[^./]*)?$/;

type NoteAttachment = {
  path?: string | null;
  src?: string | null;
};

export type WebhookPayload = {
  old_record?: { attachments?: NoteAttachment[] | null } | null;
};

// Returns the names of the files attached to the note before the change: the
// files we may delete. The payload is not trusted, so only names that look like
// files uploaded by the app are returned, at most MAX_CANDIDATES_PER_CALL.
export const getCandidateNames = (payload: WebhookPayload): string[] => {
  const attachments = payload?.old_record?.attachments;
  if (!Array.isArray(attachments)) {
    return [];
  }

  const names = Array.from(
    new Set(
      attachments
        .map(getFileName)
        .filter((name): name is string => name != null),
    ),
  );

  if (names.length > MAX_CANDIDATES_PER_CALL) {
    console.warn("Too many note attachments, only checking the first ones", {
      count: names.length,
      checked: MAX_CANDIDATES_PER_CALL,
    });
  }

  return names.slice(0, MAX_CANDIDATES_PER_CALL);
};

// Returns the bucket path of an attachment, read from its `path`, or from its
// `src` URL when it has no path. Returns null for anything that does not look
// like a file uploaded by the app (e.g. `other/0.1.pdf` or `../logo.png`), so
// the caller cannot point at other files of the bucket.
const getFileName = (attachment?: NoteAttachment | null) => {
  const name =
    typeof attachment?.path === "string" && attachment.path !== ""
      ? attachment.path
      : getBucketPath(attachment?.src);
  return name != null && UPLOADED_FILE_NAME.test(name) ? name : null;
};

// The part of a public bucket URL after "/attachments/" (the bucket name is
// fixed in the URL Supabase builds), or the last segment of any other URL.
const getBucketPath = (src?: string | null) => {
  if (typeof src !== "string") {
    return null;
  }
  try {
    const pathname = new URL(src).pathname;
    const marker = "/object/public/attachments/";
    const start = pathname.indexOf(marker);
    return safelyDecodePath(
      start < 0
        ? pathname.slice(pathname.lastIndexOf("/") + 1)
        : pathname.slice(start + marker.length),
    );
  } catch {
    return null;
  }
};

const safelyDecodePath = (path: string) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};
