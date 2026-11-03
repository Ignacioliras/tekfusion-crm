import { email, required, useGetIdentity, useRecordContext } from "ra-core";
import { BooleanInput } from "@/components/admin/boolean-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import type { Sale } from "../types";
import { ROLE_CHOICES } from "./roles";

export function SalesInputs() {
  const { identity } = useGetIdentity();
  const record = useRecordContext<Sale>();
  return (
    <div className="space-y-4 w-full">
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
      <TextInput
        source="email"
        validate={[required(), email()]}
        helperText={false}
      />
      <SelectInput
        source="role"
        choices={ROLE_CHOICES}
        defaultValue="executive"
        validate={required()}
        readOnly={record?.id === identity?.id}
        helperText={false}
      />
      {/* Deactivation goes through "Dar de baja" (OffboardButton); the switch only reactivates. */}
      {record?.disabled && (
        <BooleanInput source="disabled" helperText={false} />
      )}
    </div>
  );
}
