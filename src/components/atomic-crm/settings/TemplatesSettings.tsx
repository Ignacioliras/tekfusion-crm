import {
  useCanAccess,
  useCreate,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { renderTemplate } from "../followups/renderTemplate";
import type { SendChannel, Template } from "../types";

const T = "tekfusion.settings.templates";
const C = "tekfusion.settings.catalogs";
const CHANNELS: SendChannel[] = ["correo", "whatsapp"];
const ALL = { pagination: { page: 1, perPage: 100 } };

// Same rule as the templates_known_variables check in the base.
const UNKNOWN_VARIABLE =
  /\{\{(?!(?:nombre|empresa|producto|ejecutivo)\}\})[^}\s]*\}{0,2}/g;

const SAMPLE = {
  nombre: "Juan Pérez",
  empresa: "Constructora Ejemplo SpA",
  producto: "válvula de bola 2”",
  ejecutivo: "María Soto",
};

type Draft = Omit<Template, "id"> & { id?: Template["id"] };

const EMPTY: Draft = {
  name: "",
  channel: "correo",
  subject: "",
  body: "",
  active: true,
};

/** Follow-up templates (RF-14). Management only. */
export const TemplatesSettings = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  const { data, refetch } = useGetList<Template>("templates", {
    ...ALL,
    sort: { field: "name", order: "ASC" },
  });
  const [create] = useCreate();
  const [update] = useUpdate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess) return null;

  const options = {
    onSuccess: () => {
      setDraft(null);
      refetch();
    },
    onError: () => notify(`${C}.error`, { type: "error" }),
  };

  const save = () => {
    if (!draft) return;
    const subject = draft.channel === "correo" ? draft.subject?.trim() : null;
    const unknown = `${subject ?? ""} ${draft.body}`.match(UNKNOWN_VARIABLE);
    if (unknown) {
      setError(
        translate(`${T}.unknown_variables`, { variables: unknown.join(", ") }),
      );
      return;
    }
    if (!draft.name.trim() || !draft.body.trim()) {
      setError(translate(`${C}.required`));
      return;
    }
    setError(null);
    const { id, ...fields } = draft;
    const values = {
      ...fields,
      name: fields.name.trim(),
      subject: subject || null,
    };
    if (id == null) create("templates", { data: values }, options);
    else
      update(
        "templates",
        { id, data: values, previousData: data?.find((t) => t.id === id) },
        options,
      );
  };

  const toggle = (template: Template) =>
    update(
      "templates",
      {
        id: template.id,
        data: { active: !template.active },
        previousData: template,
      },
      options,
    );

  return (
    <Card id="templates">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate(`${T}.title`)}
        </h2>
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {translate(`${C}.empty`)}
          </p>
        )}
        <ul className="divide-y">
          {data?.map((template) => (
            <li key={template.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm">
                {template.name}{" "}
                <span className="text-muted-foreground">
                  · {translate(`${T}.channels.${template.channel}`)}
                  {!template.active && ` · ${translate(`${C}.inactive`)}`}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`${translate(`${C}.edit`)} ${template.name}`}
                onClick={() => {
                  setError(null);
                  setDraft({ ...template, subject: template.subject ?? "" });
                }}
              >
                {translate(`${C}.edit`)}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${translate(template.active ? `${C}.deactivate` : `${C}.activate`)} ${template.name}`}
                onClick={() => toggle(template)}
              >
                {translate(
                  template.active ? `${C}.deactivate` : `${C}.activate`,
                )}
              </Button>
            </li>
          ))}
        </ul>
        {draft ? (
          <div className="space-y-3 rounded-md border p-3">
            <Field label={translate(`${T}.name`)} id="template-name">
              <Input
                id="template-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label={translate(`${T}.channel`)} id="template-channel">
              <select
                id="template-channel"
                className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                value={draft.channel}
                onChange={(e) =>
                  setDraft({ ...draft, channel: e.target.value as SendChannel })
                }
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {translate(`${T}.channels.${channel}`)}
                  </option>
                ))}
              </select>
            </Field>
            {draft.channel === "correo" && (
              <Field label={translate(`${T}.subject`)} id="template-subject">
                <Input
                  id="template-subject"
                  value={draft.subject ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value })
                  }
                />
              </Field>
            )}
            <Field label={translate(`${T}.body`)} id="template-body">
              <Textarea
                id="template-body"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {translate(`${T}.help`)}
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <section
              aria-label={translate(`${T}.preview`)}
              className="rounded-md bg-muted p-3 text-sm"
            >
              <p className="mb-1 font-medium">{translate(`${T}.preview`)}</p>
              {draft.channel === "correo" && (
                <p className="font-medium">
                  {renderTemplate(draft.subject, SAMPLE)}
                </p>
              )}
              {/* Plain text: the template is never rendered as HTML. */}
              <p className="whitespace-pre-wrap">
                {renderTemplate(draft.body, SAMPLE)}
              </p>
            </section>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft(null)}
              >
                {translate(`${C}.cancel`)}
              </Button>
              <Button type="button" onClick={save}>
                {translate(`${C}.save`)}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null);
              setDraft(EMPTY);
            }}
          >
            {translate(`${C}.add`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const Field = ({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);
