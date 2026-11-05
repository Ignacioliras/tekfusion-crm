import {
  useGetList,
  type DataProvider,
  type Identifier,
  type SortPayload,
} from "ra-core";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

// Catalogs edited in Configuración. They are their own tables, but the page has
// one way to save: edits stay in the form until the fixed "Guardar" button.
export const CATALOGS = ["templates", "quick_replies", "lost_reasons"] as const;
export type Catalog = (typeof CATALOGS)[number];

type Row = { id?: Identifier } & Record<string, unknown>;

const ALL = { page: 1, perPage: 100 };
const fieldOf = (catalog: Catalog) => `catalogs.${catalog}`;

/**
 * The catalog's rows as the form holds them (new ones have no id yet) and a
 * setter that marks the form dirty. Loads the table into the form, and again
 * after each save so new rows get their id.
 */
export const useStagedCatalog = <T extends Row>(
  catalog: Catalog,
  sort: SortPayload,
): { rows: T[]; write: (rows: T[]) => void } => {
  const { setValue } = useFormContext();
  const { data } = useGetList<T & { id: Identifier }>(catalog, {
    pagination: ALL,
    sort,
  });
  const rows = useWatch({ name: fieldOf(catalog) }) as T[] | undefined;
  const isMissing = rows === undefined;

  useEffect(() => {
    // Not dirty: loading the table is not a change to save.
    if (data) setValue(fieldOf(catalog), data);
  }, [data, isMissing, catalog, setValue]);

  return {
    rows: rows ?? [],
    write: (next) => setValue(fieldOf(catalog), next, { shouldDirty: true }),
  };
};

const changed = (row: Row, saved: Row) =>
  Object.keys(row).some((key) => (row[key] ?? null) !== (saved[key] ?? null));

/**
 * Writes the staged catalogs: creates rows without id, updates the ones that
 * differ from the table. Lost reasons take their position from the list order.
 */
export const saveCatalogs = async (
  dataProvider: DataProvider,
  catalogs: Partial<Record<Catalog, Row[]>> | undefined,
): Promise<void> => {
  for (const catalog of CATALOGS) {
    const rows = catalogs?.[catalog];
    if (!rows) continue;
    const { data: saved } = await dataProvider.getList(catalog, {
      pagination: ALL,
      sort: { field: "id", order: "ASC" },
      filter: {},
    });
    for (const [index, { id, ...fields }] of rows.entries()) {
      const data =
        catalog === "lost_reasons" ? { ...fields, position: index } : fields;
      if (id == null) {
        await dataProvider.create(catalog, { data });
        continue;
      }
      const previous = saved.find((row) => row.id === id);
      if (previous && changed(data, previous)) {
        await dataProvider.update(catalog, {
          id,
          data,
          previousData: previous,
        });
      }
    }
  }
};
