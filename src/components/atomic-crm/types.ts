import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
} from "./consts";
import type { LineaNegocio } from "./tekfusion/lineas";

// TekFusion (Fase 2, supabase/schemas/10_tekfusion_tables.sql). Enum values are
// in Spanish on purpose: they match the UI constants and the lead classifier.
export type UserRole = "manager" | "executive" | "reader";
export type OriginChannel =
  "correo" | "formulario" | "bot" | "whatsapp" | "manual" | "migracion";

export type BusinessLineConfig = {
  code: Exclude<LineaNegocio, "indeterminada">;
  name: string;
  owner_sales_id?: Identifier | null;
  substitute_sales_id?: Identifier | null;
  keywords: string[];
};

export type LostReason = {
  name: string;
  active: boolean;
  position: number;
} & Pick<RaRecord, "id">;

// Fase 3 (supabase/schemas/10_tekfusion_tables.sql): quotes, follow-ups,
// templates, alerts and the audit trail that feeds the lead timeline.
export type SendChannel = "correo" | "whatsapp";
export type DeliveryStatus =
  "pendiente" | "enviado" | "entregado" | "leido" | "fallido";
export type FollowupMode = "automatico" | "recordatorio";
export type FollowupStatus = "pendiente" | "enviado" | "vencido" | "cancelado";

export type Quote = {
  created_at: string;
  deal_id: Identifier;
  version: number;
  amount: number;
  pdf_path: string;
  is_current: boolean;
  sent_at?: string | null;
  sent_channels: SendChannel[];
  delivery_status: DeliveryStatus;
  sales_id?: Identifier | null;
} & Pick<RaRecord, "id">;

export type Followup = {
  created_at: string;
  deal_id: Identifier;
  step: number;
  scheduled_at: string;
  channels: SendChannel[];
  mode: FollowupMode;
  template_id?: Identifier | null;
  status: FollowupStatus;
  sent_at?: string | null;
  attempts: number;
  cancel_reason?: string | null;
} & Pick<RaRecord, "id">;

export type Template = {
  name: string;
  channel: SendChannel;
  subject?: string | null;
  body: string;
  active: boolean;
} & Pick<RaRecord, "id">;

export type QuickReply = {
  title: string;
  body: string;
  active: boolean;
} & Pick<RaRecord, "id">;

export type Alert = {
  created_at: string;
  type: string;
  recipient_sales_id: Identifier;
  deal_id?: Identifier | null;
  message: string;
  read_at?: string | null;
} & Pick<RaRecord, "id">;

export type AuditLogEntry = {
  created_at: string;
  actor_sales_id?: Identifier | null;
  action: string;
  target_sales_id?: Identifier | null;
  deal_id?: Identifier | null;
  details: Record<string, unknown>;
} & Pick<RaRecord, "id">;

export type SalesAbsence = {
  sales_id: Identifier;
  starts_on: string;
  ends_on: string;
  reason?: string | null;
} & Pick<RaRecord, "id">;

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SalesFormData = {
  avatar?: string;
  email: string;
  secondary_emails?: string[];
  password?: string;
  first_name: string;
  last_name: string;
  administrator: boolean;
  /** Sent to the users Edge Function; `administrator` is derived from it. */
  role?: UserRole;
  disabled: boolean;
};

export type Sale = {
  first_name: string;
  last_name: string;
  administrator: boolean;
  /** Source of truth for permissions; `administrator` is kept in sync by a trigger. */
  role: UserRole;
  whatsapp_phone?: string | null;
  signature?: string | null;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  secondary_emails?: string[];

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  state_abbr: string;
  sales_id?: Identifier;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
  nb_deals?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  number: string;
  type: "Work" | "Home" | "Other";
};

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id?: Identifier | null;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: number[];
  gender: string;
  sales_id?: Identifier;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  do_not_contact: boolean;
  anonymized_at?: string | null;
  nb_tasks?: number;
  company_name?: string;
} & Pick<RaRecord, "id">;

export type ContactNote = {
  contact_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  status: string;
  attachments?: AttachmentNote[];
} & Pick<RaRecord, "id">;

export type Deal = {
  name: string;
  company_id: Identifier;
  contact_ids: Identifier[];
  categories: string[];
  stage: string;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  expected_closing_date: string;
  sales_id: Identifier;
  index: number;
  business_line: LineaNegocio;
  ai_confidence?: number | null;
  origin_channel: OriginChannel;
  raw_source?: Record<string, unknown> | null;
  first_response_at?: string | null;
  last_activity_at: string;
  lost_reason_id?: Identifier | null;
  won_amount?: number | null;
  previous_deal_id?: Identifier | null;
  followups_enabled: boolean;
} & Pick<RaRecord, "id">;

export type DealNote = {
  deal_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  attachments?: AttachmentNote[];

  // This is defined for compatibility with `ContactNote`
  status?: undefined;
} & Pick<RaRecord, "id">;

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type Task = {
  contact_id: Identifier;
  type: string;
  text: string;
  due_date: string;
  done_date?: string | null;
  sales_id?: Identifier;
  created_at?: string;
} & Pick<RaRecord, "id">;

export type ActivityCompanyCreated = {
  type: typeof COMPANY_CREATED;
  company_id: Identifier;
  company: Company;
  sales_id: Identifier;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactNoteCreated = {
  type: typeof CONTACT_NOTE_CREATED;
  sales_id?: Identifier;
  contactNote: ContactNote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealCreated = {
  type: typeof DEAL_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
};

export type ActivityDealNoteCreated = {
  type: typeof DEAL_NOTE_CREATED;
  sales_id?: Identifier;
  dealNote: DealNote;
  date: string;
};

export type Activity = RaRecord &
  (
    | ActivityCompanyCreated
    | ActivityContactCreated
    | ActivityContactNoteCreated
    | ActivityDealCreated
    | ActivityDealNoteCreated
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;

export interface LabeledValue {
  value: string;
  label: string;
}

export type DealStage = LabeledValue;

export interface NoteStatus extends LabeledValue {
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export type SearchResourceName =
  "companies" | "contacts" | "deals" | "tasks" | "contact_notes" | "deal_notes";

export type SearchResult = {
  resource: SearchResourceName;
  record_id: Identifier;
  title: string | null;
  subtitle: string | null;
  contact_id: Identifier | null;
  deal_id: Identifier | null;
  date: string | null;
  /** The searched fields, to show and highlight where the query matched. */
  content: string | null;
};
