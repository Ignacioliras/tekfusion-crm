import type { DataProvider } from "ra-core";
import { transformFilter } from "./transformFilter";

function removeSummarySuffix(resource: string) {
  return resource.endsWith("_summary")
    ? resource.replace("_summary", "")
    : resource;
}

// A '@or' with operators other than ilike (e.g. the kanban's "stage@in" or
// "closed_at@gte") is a real OR, not a full-text search (which becomes `q`).
const isConditionOr = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).some(
    (key) => key.includes("@") && !key.endsWith("@ilike"),
  );

const ALL_ROWS = { page: 1, perPage: Number.MAX_SAFE_INTEGER };

export function withSupabaseFilterAdapter<T extends DataProvider>(
  dataProvider: T,
): T {
  return {
    ...dataProvider,
    getOne(resource, params) {
      return dataProvider.getOne(removeSummarySuffix(resource), params);
    },
    async getList(resource, params) {
      const target = removeSummarySuffix(resource);
      const { "@or": or, ...rest } = params.filter ?? {};
      if (!isConditionOr(or)) {
        return dataProvider.getList(target, {
          ...params,
          filter: transformFilter(params.filter),
        });
      }
      // FakeRest has no OR: query each branch with the rest of the filter,
      // then list the union (sorted and paginated by FakeRest).
      const branches = await Promise.all(
        Object.entries(or).map(([key, value]) =>
          dataProvider.getList(target, {
            pagination: ALL_ROWS,
            sort: { field: "id", order: "ASC" },
            filter: transformFilter({ ...rest, [key]: value }),
          }),
        ),
      );
      const ids = [
        ...new Set(branches.flatMap(({ data }) => data.map(({ id }) => id))),
      ];
      return dataProvider.getList(target, {
        ...params,
        filter: { id_eq_any: ids },
      });
    },
    getMany(resource, params) {
      return dataProvider.getMany(removeSummarySuffix(resource), params);
    },
    getManyReference(resource, params) {
      return dataProvider.getManyReference(removeSummarySuffix(resource), {
        ...params,
        filter: transformFilter(params.filter),
      });
    },
    create(resource, params) {
      return dataProvider.create(removeSummarySuffix(resource), params);
    },
    delete(resource, params) {
      return dataProvider.delete(removeSummarySuffix(resource), params);
    },
    deleteMany(resource, params) {
      return dataProvider.deleteMany(removeSummarySuffix(resource), params);
    },
    update(resource, params) {
      return dataProvider.update(removeSummarySuffix(resource), params);
    },
    updateMany(resource, params) {
      return dataProvider.updateMany(removeSummarySuffix(resource), params);
    },
  };
}
