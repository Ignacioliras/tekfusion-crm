import { useTranslate } from "ra-core";
import { Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DeliveryStatus, WaMessage } from "../types";

// docs/07: ✓ sent, ✓✓ delivered, blue ✓✓ read.
const STATUS_MARK: Record<
  DeliveryStatus,
  { mark: string; className?: string }
> = {
  pendiente: { mark: "🕓" },
  enviado: { mark: "✓" },
  entregado: { mark: "✓✓" },
  leido: { mark: "✓✓", className: "text-sky-500" },
  fallido: { mark: "!", className: "text-destructive font-bold" },
};

// Only plain storage paths become links: anything with a scheme (javascript:,
// data:, https://…) is hostile input and is shown as text.
// ponytail: raw storage path, swap for a 60 s signed URL in Fase 4 (docs/07).
const SAFE_PATH = /^[\w\-./]+$/;
const attachmentHref = (path: string): string | undefined =>
  SAFE_PATH.test(path) && !path.includes("..") ? path : undefined;

const fileName = (path: string) => path.split("/").pop() || path;

const formatSantiago = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });

const Attachment = ({ message }: { message: WaMessage }) => {
  const path = message.attachment_path;
  if (!path) return null;
  const href = attachmentHref(path);
  if (message.type === "audio") {
    return (
      <audio controls src={href} preload="none" className="max-w-full">
        {fileName(path)}
      </audio>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 underline break-all"
    >
      <Paperclip className="size-4 shrink-0" aria-hidden />
      {fileName(path)}
    </a>
  );
};

interface MessageBubbleProps {
  message: WaMessage;
  /** Full name of `message.author_sales_id`, looked up once by the panel. */
  authorName?: string;
}

export const MessageBubble = ({ message, authorName }: MessageBubbleProps) => {
  const translate = useTranslate();
  const isOutgoing = message.direction === "saliente";
  const status = STATUS_MARK[message.status];
  // Who wrote it: typed on the corporate phone, or sent from the CRM by someone.
  const author = message.from_me_phone
    ? [translate("tekfusion.whatsapp.from_phone"), authorName]
        .filter(Boolean)
        .join(" · ")
    : isOutgoing && message.origin === "crm"
      ? authorName
      : undefined;
  return (
    <li
      className={cn(
        "max-w-[75%] rounded-lg px-3 py-2 text-sm flex flex-col gap-1",
        isOutgoing ? "self-end bg-primary/10" : "self-start bg-muted",
      )}
    >
      <Attachment message={message} />
      {/* Plain text only (CLAUDE.md rule 11): React escapes it. */}
      {message.text ? (
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      ) : null}
      {author ? (
        <span className="text-xs italic text-muted-foreground">{author}</span>
      ) : null}
      <span className="self-end flex items-center gap-1 text-xs text-muted-foreground">
        {formatSantiago(message.sent_at)}
        {isOutgoing ? (
          <span
            role="img"
            aria-label={translate(
              `tekfusion.whatsapp.status.${message.status}`,
            )}
            title={translate(`tekfusion.whatsapp.status.${message.status}`)}
            className={status.className}
          >
            {status.mark}
          </span>
        ) : null}
      </span>
    </li>
  );
};
