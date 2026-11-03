import { useTranslate } from "ra-core";
import { MessageCircle } from "lucide-react";

// Placeholder until the WhatsApp inbox is built (docs/09-plan-fases.md, Fase 4).
export const WhatsAppPage = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <MessageCircle className="size-10" aria-hidden />
      <h1 className="text-xl font-semibold text-foreground">
        {translate("crm.navigation.whatsapp")}
      </h1>
      <p>{translate("crm.whatsapp.coming_soon")}</p>
    </div>
  );
};

WhatsAppPage.path = "/whatsapp";
