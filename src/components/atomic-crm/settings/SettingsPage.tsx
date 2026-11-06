import { RotateCcw, Save } from "lucide-react";
import {
  EditBase,
  Form,
  useDataProvider,
  useInput,
  useNotify,
  useRefresh,
  useSaveContext,
  useTranslate,
} from "ra-core";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toSlug } from "@/lib/toSlug";
import { ArrayInput } from "@/components/admin/array-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";

import ImageEditorField from "../misc/ImageEditorField";
import {
  useConfigurationContext,
  useConfigurationUpdater,
  type ConfigurationContextValue,
} from "../root/ConfigurationContext";
import { defaultConfiguration } from "../root/defaultConfiguration";
import {
  FollowupSettings,
  followupFromForm,
  followupToForm,
  type FollowupFormValues,
} from "./FollowupSettings";
import {
  ReportSettings,
  reportFromForm,
  reportToForm,
  type ReportFormValues,
} from "./ReportSettings";
import { SettingsTags } from "./SettingsTags";
import { TemplatesSettings } from "./TemplatesSettings";
import { QuickRepliesSettings } from "./QuickRepliesSettings";
import { LostReasonsSettings } from "./LostReasonsSettings";
import { saveCatalogs } from "./stagedCatalogs";

const SECTIONS = [
  {
    id: "branding",
    label: "crm.settings.sections.branding",
    fallback: "Branding",
  },
  {
    id: "companies",
    label: "resources.companies.name",
    fallback: "Companies",
  },
  { id: "deals", label: "resources.deals.name", fallback: "Deals" },
  { id: "notes", label: "resources.notes.name", fallback: "Notes" },
  { id: "tasks", label: "resources.tasks.name", fallback: "Tasks" },
  { id: "tags", label: "resources.tags.name", fallback: "Tags" },
  { id: "followups", label: "tekfusion.settings.followups.title" },
  { id: "report", label: "tekfusion.settings.report.title" },
  { id: "templates", label: "tekfusion.settings.templates.title" },
  { id: "quick_replies", label: "tekfusion.settings.quick_replies.title" },
  { id: "lost_reasons", label: "tekfusion.settings.lost_reasons.title" },
];

/** Ensure every item in a { value, label } array has a value (slug from label). */
const ensureValues = (items: { value?: string; label: string }[] | undefined) =>
  items?.map((item) => ({ ...item, value: item.value || toSlug(item.label) }));

const getCurrencyChoices = () => {
  const displayNames = new Intl.DisplayNames(
    typeof navigator !== "undefined"
      ? (navigator.languages as string[])
      : ["en"],
    { type: "currency" },
  );
  return Intl.supportedValuesOf("currency").map((code) => ({
    id: code,
    name: `${code} – ${displayNames.of(code)}`,
  }));
};

const transformFormValues = (data: Record<string, any>) => ({
  config: {
    title: data.title,
    lightModeLogo: data.lightModeLogo,
    darkModeLogo: data.darkModeLogo,
    currency: data.currency,
    companySectors: ensureValues(data.companySectors),
    dealCategories: ensureValues(data.dealCategories),
    taskTypes: ensureValues(data.taskTypes),
    // Read only in the form: saved exactly as they come from the configuration.
    dealStages: data.dealStages,
    dealPipelineStatuses: data.dealPipelineStatuses,
    noteStatuses: ensureValues(data.noteStatuses),
    ...followupFromForm(data as FollowupFormValues),
    ...reportFromForm(data as ReportFormValues),
  } as ConfigurationContextValue,
});

/** Config → form values: shared by the initial values and "reset defaults". */
const toFormValues = (config: ConfigurationContextValue) => ({
  title: config.title,
  lightModeLogo: { src: config.lightModeLogo },
  darkModeLogo: { src: config.darkModeLogo },
  currency: config.currency,
  companySectors: config.companySectors,
  dealCategories: config.dealCategories,
  taskTypes: config.taskTypes,
  dealStages: config.dealStages,
  dealPipelineStatuses: config.dealPipelineStatuses,
  noteStatuses: config.noteStatuses,
  ...followupToForm(config),
  ...reportToForm(config),
});

/**
 * Configuración (management only). One way to save: the fixed "Guardar" button
 * writes the configuration and the staged catalogs. `embedded`: inside the
 * mobile settings page, with the save bar in the flow instead of fixed.
 */
export const SettingsPage = ({ embedded = false }: { embedded?: boolean }) => {
  const updateConfiguration = useConfigurationUpdater();
  const notify = useNotify();

  return (
    <EditBase
      resource="configuration"
      id={1}
      mutationMode="pessimistic"
      redirect={false}
      transform={transformFormValues}
      mutationOptions={{
        onSuccess: (data: any) => {
          updateConfiguration(data.config);
          notify("crm.settings.saved");
        },
        onError: () => {
          notify("crm.settings.save_error", {
            type: "error",
          });
        },
      }}
    >
      <SettingsForm embedded={embedded} />
    </EditBase>
  );
};

SettingsPage.path = "/settings";

const SettingsForm = ({ embedded }: { embedded: boolean }) => {
  const config = useConfigurationContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const { save } = useSaveContext();

  const defaultValues = useMemo(() => toFormValues(config), [config]);

  // Catalogs first: if one fails, nothing of the configuration is half saved.
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await saveCatalogs(dataProvider, values.catalogs);
    } catch {
      notify("tekfusion.settings.catalogs.error", { type: "error" });
      refresh();
      return;
    }
    await save?.(values);
    refresh();
  };

  return (
    <Form defaultValues={defaultValues} onSubmit={handleSubmit}>
      <SettingsFormFields embedded={embedded} />
    </Form>
  );
};

const SettingsFormFields = ({ embedded }: { embedded: boolean }) => {
  const translate = useTranslate();
  const currencyChoices = useMemo(() => getCurrencyChoices(), []);
  const {
    reset,
    formState: { isSubmitting },
  } = useFormContext();

  const { dealStages } = useConfigurationContext();

  return (
    <div
      className={
        embedded ? "flex flex-col mt-4 pb-24" : "flex gap-8 mt-4 pb-20"
      }
    >
      {/* Left navigation */}
      <nav className="hidden md:block w-48 shrink-0">
        <div className="sticky top-4 space-y-1">
          <h1 className="text-2xl font-semibold px-3 mb-2">
            {translate("crm.settings.title")}
          </h1>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                document
                  .getElementById(section.id)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="block w-full text-left px-3 py-1 text-sm rounded-md hover:text-foreground hover:bg-muted transition-colors"
            >
              {translate(section.label, {
                smart_count: 2,
                _: section.fallback,
              })}
            </button>
          ))}
          <Link
            to="/sales"
            className="block w-full text-left px-3 py-1 text-sm rounded-md hover:text-foreground hover:bg-muted transition-colors"
          >
            {translate("resources.sales.name", { smart_count: 2 })}
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 max-w-2xl space-y-6">
        {/* Branding */}
        <Card id="branding">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {translate("crm.settings.sections.branding")}
            </h2>
            <TextInput source="title" label="crm.settings.app_title" />
            <div className="flex gap-8">
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground">
                  {translate("crm.settings.light_mode_logo")}
                </p>
                <ImageEditorField
                  source="lightModeLogo"
                  width={200}
                  height={48}
                  linkPosition="bottom"
                  backgroundImageColor="#f5f5f5"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground">
                  {translate("crm.settings.dark_mode_logo")}
                </p>
                <ImageEditorField
                  source="darkModeLogo"
                  width={200}
                  height={48}
                  linkPosition="bottom"
                  backgroundImageColor="#1a1a1a"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies */}
        <Card id="companies">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {translate("resources.companies.name", {
                smart_count: 2,
              })}
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              {translate("crm.settings.companies.sectors")}
            </h3>
            <ArrayInput
              source="companySectors"
              label={false}
              helperText={false}
            >
              <SimpleFormIterator disableReordering disableClear>
                <TextInput source="label" label={false} />
              </SimpleFormIterator>
            </ArrayInput>
          </CardContent>
        </Card>

        {/* Deals */}
        <Card id="deals">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {translate("resources.deals.name", {
                smart_count: 2,
              })}
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              {translate("crm.settings.deals.currency")}
            </h3>
            <AutocompleteInput
              source="currency"
              label={false}
              choices={currencyChoices}
              inputText={(choice) => choice?.id}
              modal
            />

            <Separator />

            <h3 className="text-lg font-medium text-muted-foreground">
              {translate("crm.settings.deals.stages")}
            </h3>
            {/* Fixed stages (docs/10, 2026-11-05): read only, saved as they are. */}
            <ol className="list-decimal pl-6 space-y-1 text-sm">
              {dealStages.map((stage) => (
                <li key={stage.value}>{stage.label}</li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              {translate("tekfusion.settings.stages.read_only_help")}
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card id="notes">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {translate("resources.notes.name", {
                smart_count: 2,
              })}
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              {translate("crm.settings.notes.statuses")}
            </h3>
            <ArrayInput source="noteStatuses" label={false} helperText={false}>
              <SimpleFormIterator inline disableReordering disableClear>
                <TextInput source="label" label={false} className="flex-1" />
                <ColorInput source="color" />
              </SimpleFormIterator>
            </ArrayInput>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card id="tasks">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {translate("resources.tasks.name", {
                smart_count: 2,
              })}
            </h2>
            <h3 className="text-lg font-medium text-muted-foreground">
              {translate("crm.settings.tasks.types")}
            </h3>
            <ArrayInput source="taskTypes" label={false} helperText={false}>
              <SimpleFormIterator disableReordering disableClear>
                <TextInput source="label" label={false} />
              </SimpleFormIterator>
            </ArrayInput>
          </CardContent>
        </Card>

        {/* Tags */}
        <SettingsTags />

        {/* TekFusion parameters (RF-14), management only */}
        <FollowupSettings />
        <ReportSettings />
        <TemplatesSettings />
        <QuickRepliesSettings />
        <LostReasonsSettings />
      </div>

      {/* Sticky save button */}
      <div
        className={
          embedded
            ? "fixed bottom-14 left-0 right-0 z-40 border-t bg-background p-4"
            : "fixed bottom-0 left-0 right-0 border-t bg-background p-4"
        }
      >
        <div className="max-w-screen-xl mx-auto flex gap-8 px-4">
          <div className="hidden md:block w-48 shrink-0" />
          <div className="flex-1 min-w-0 max-w-2xl flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(toFormValues(defaultConfiguration))}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {translate("crm.settings.reset_defaults")}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                {translate("ra.action.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-1" />
                {isSubmitting
                  ? translate("crm.settings.saving")
                  : translate("ra.action.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** A minimal color picker input compatible with ra-core's useInput. */
const ColorInput = ({ source }: { source: string }) => {
  const { field } = useInput({ source });
  return (
    <input
      type="color"
      {...field}
      value={field.value || "#000000"}
      className="w-9 h-9 shrink-0 cursor-pointer appearance-none rounded border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:cursor-pointer [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:cursor-pointer [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-none"
    />
  );
};
