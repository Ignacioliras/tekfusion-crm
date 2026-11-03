import { useMutation } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import {
  Form,
  useDataProvider,
  useGetList,
  useNotify,
  useRefresh,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";

import { BooleanInput } from "@/components/admin/boolean-input";
import { FileField } from "@/components/admin/file-field";
import { FileInput } from "@/components/admin/file-input";
import { NumberInput } from "@/components/admin/number-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  QUOTE_MAX_BYTES,
  validateQuoteFile,
} from "../providers/commons/quoteFile";
import type { CrmDataProvider } from "../providers/types";
import type { Deal, Quote, SendChannel } from "../types";

interface QuoteFormValues {
  pdf?: { rawFile?: File };
  amount?: number;
  send_correo?: boolean;
  send_whatsapp?: boolean;
}

const validatePdf = (value: QuoteFormValues["pdf"]) => {
  if (!value?.rawFile) return "tekfusion.quote.file_required";
  const invalid = validateQuoteFile(value.rawFile);
  if (invalid === "type") return "tekfusion.quote.file_type";
  if (invalid === "size") return "tekfusion.quote.file_size";
  return undefined;
};

// Field-level on purpose: ra-core skips input validators when the form has its own.
const validateChannels = (
  value: boolean | undefined,
  values: QuoteFormValues,
) =>
  value || values.send_correo ? undefined : "tekfusion.quote.channels_required";

const validateAmount = (value: number | undefined) =>
  !value || value < 1 ? "tekfusion.quote.amount_required" : undefined;

const channelsOf = (values: QuoteFormValues): SendChannel[] => [
  ...(values.send_correo ? (["correo"] as const) : []),
  ...(values.send_whatsapp ? (["whatsapp"] as const) : []),
];

/**
 * "Enviar cotización" (RF-06): upload the PDF and amount as a new version,
 * then send_quote() enqueues it per channel (n8n sends it in Fase 5), moves
 * the lead to cotizado and schedules the default follow-ups.
 */
export const SendQuoteButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const { data: current } = useGetList<Quote>("quotes", {
    filter: { deal_id: deal.id, is_current: true },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "version", order: "DESC" },
  });
  const currentVersion = current?.[0]?.version;

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      const file = values.pdf?.rawFile as File;
      const pdfPath = await dataProvider.uploadQuotePdf(deal.id, file);
      const { data: quote } = await dataProvider.create<Quote>("quotes", {
        data: {
          deal_id: deal.id,
          amount: Math.round(Number(values.amount)),
          pdf_path: pdfPath,
        },
      });
      await dataProvider.sendQuote(quote.id, channelsOf(values));
      return quote;
    },
    onSuccess: (quote) => {
      setOpen(false);
      notify("tekfusion.quote.sent", {
        type: "info",
        messageArgs: { version: quote.version },
      });
      refresh();
    },
    onError: () => notify("tekfusion.quote.error", { type: "error" }),
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <FileText className="size-4" />
        {translate("tekfusion.lead.actions.send_quote")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{translate("tekfusion.quote.title")}</DialogTitle>
            <DialogDescription>
              {currentVersion
                ? translate("tekfusion.quote.replaces", {
                    version: currentVersion,
                  })
                : deal.name}
            </DialogDescription>
          </DialogHeader>
          <Form
            defaultValues={{
              amount: deal.amount || undefined,
              send_correo: true,
              send_whatsapp: false,
            }}
            onSubmit={(values: FieldValues) =>
              mutate(values as QuoteFormValues)
            }
          >
            <div className="flex flex-col gap-4">
              <FileInput
                source="pdf"
                label="tekfusion.quote.file"
                helperText="tekfusion.quote.file_help"
                accept={{ "application/pdf": [".pdf"] }}
                maxSize={QUOTE_MAX_BYTES}
                validate={validatePdf}
              >
                <FileField source="src" title="title" />
              </FileInput>
              <NumberInput
                source="amount"
                label="tekfusion.quote.amount"
                step={1}
                validate={validateAmount}
                helperText={false}
              />
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium mb-2">
                  {translate("tekfusion.quote.channels")}
                </legend>
                <BooleanInput
                  source="send_correo"
                  label="Correo"
                  helperText={false}
                />
                <BooleanInput
                  source="send_whatsapp"
                  label="WhatsApp"
                  validate={validateChannels}
                  helperText={false}
                />
              </fieldset>
              {deal.followups_enabled ? null : (
                <p className="text-sm text-muted-foreground">
                  {translate("tekfusion.quote.no_followups")}
                </p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {translate("tekfusion.common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {translate("tekfusion.quote.submit")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
