import { useMutation } from "@tanstack/react-query";
import { useDataProvider, useGetList, useNotify, useTranslate } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatAmount } from "../tekfusion/money";
import type { Deal, Quote } from "../types";

/** Every version of the lead's quotes, current first-in-line (RF-06). */
export const QuoteHistory = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { data: quotes } = useGetList<Quote>("quotes", {
    filter: { deal_id: deal.id },
    pagination: { page: 1, perPage: 50 },
    sort: { field: "version", order: "DESC" },
  });
  if (!quotes?.length) return null;

  return (
    <section
      aria-label={translate("tekfusion.quote.history")}
      className="flex flex-col gap-2"
    >
      <h3 className="text-sm font-semibold">
        {translate("tekfusion.quote.history")}
      </h3>
      <ul className="flex flex-col gap-2">
        {quotes.map((quote) => (
          <QuoteRow key={quote.id} quote={quote} />
        ))}
      </ul>
    </section>
  );
};

const QuoteRow = ({ quote }: { quote: Quote }) => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  // Signed on click: the URL lives 60 minutes and the storage policy checks the lead.
  const { mutate: openPdf } = useMutation({
    mutationFn: () => dataProvider.getQuotePdfUrl(quote.pdf_path),
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError: () => notify("tekfusion.common.save_error", { type: "error" }),
  });

  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={quote.is_current ? "font-medium" : "text-muted-foreground"}
      >
        v{quote.version} · {formatAmount(quote.amount, currency)}
      </span>
      {quote.is_current ? (
        <Badge variant="outline">{translate("tekfusion.quote.current")}</Badge>
      ) : null}
      <Button
        variant="link"
        size="sm"
        className="ml-auto h-auto p-0"
        onClick={() => openPdf()}
      >
        {translate("tekfusion.quote.view_pdf")}
      </Button>
    </li>
  );
};
