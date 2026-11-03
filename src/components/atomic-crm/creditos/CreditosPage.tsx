import { Card, CardContent } from "@/components/ui/card";

const THIRD_PARTY_COMPONENTS = [
  { name: "Atomic CRM", author: "marmelab", license: "MIT" },
  { name: "shadcn/ui", author: "shadcn", license: "MIT" },
  { name: "react-admin / ra-core", author: "marmelab", license: "MIT" },
  { name: "Supabase", author: "Supabase", license: "Apache 2.0" },
  { name: "n8n", author: "n8n GmbH", license: "Sustainable Use License" },
];

const EVOLUTION_API_URL = "https://github.com/EvolutionAPI/evolution-api";

export const CreditosPage = () => (
  <div className="max-w-2xl mx-auto mt-4 pb-20 space-y-6">
    <h1 className="text-2xl font-semibold">Créditos</h1>

    <Card>
      <CardContent className="space-y-2">
        <p>
          Este sistema fue desarrollado por <strong>Libux</strong> para{" "}
          <strong>TekFusion</strong>.
        </p>
      </CardContent>
    </Card>

    <Card id="whatsapp" className="border-primary">
      <CardContent className="space-y-2">
        <h2 className="text-xl font-semibold">WhatsApp</h2>
        <p>
          La mensajería de WhatsApp de este sistema usa{" "}
          <a
            href={EVOLUTION_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Evolution API
          </a>
          , distribuida bajo licencia Apache 2.0 con condición de atribución.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          Componentes de terceros
        </h2>
        <ul className="divide-y">
          {THIRD_PARTY_COMPONENTS.map((component) => (
            <li
              key={component.name}
              className="flex justify-between gap-4 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{component.name}</span>{" "}
                <span className="text-muted-foreground">
                  ({component.author})
                </span>
              </span>
              <span className="text-muted-foreground">{component.license}</span>
            </li>
          ))}
          <li className="flex justify-between gap-4 py-2 text-sm">
            <span>
              <span className="font-medium">Evolution API</span>{" "}
              <span className="text-muted-foreground">(EvolutionAPI)</span>
            </span>
            <span className="text-muted-foreground">
              Apache 2.0 (con atribución)
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
);

CreditosPage.path = "/creditos";
