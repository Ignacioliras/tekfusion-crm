import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  KanbanSquare,
  List,
  MessageCircle,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { CanAccess, useTranslate } from "ra-core";
import { Link, matchPath, useLocation, useMatch } from "react-router";
import { ContactCreateSheet } from "../contacts/ContactCreateSheet";
import { useState } from "react";
import { NoteCreateSheet } from "../notes/NoteCreateSheet";
import { TaskCreateSheet } from "../tasks/TaskCreateSheet";
import { DealTableList } from "../deals/DealTableList";
import { WhatsAppPage } from "../whatsapp/WhatsAppPage";

// Same items and order as the desktop header (layout/Header.tsx).
const NAV_ITEMS = [
  { href: "/deals", Icon: KanbanSquare, labelKey: "crm.navigation.pipeline" },
  { href: DealTableList.path, Icon: List, labelKey: "resources.deals.name" },
  { href: "/contacts", Icon: Users, labelKey: "resources.contacts.name" },
  { href: "/companies", Icon: Building2, labelKey: "resources.companies.name" },
  {
    href: WhatsAppPage.path,
    Icon: MessageCircle,
    labelKey: "crm.navigation.whatsapp",
  },
  { href: "/", Icon: Home, labelKey: "crm.navigation.dashboard" },
  { href: "/settings", Icon: Settings, labelKey: "crm.settings.title" },
];

export const MobileNavigation = () => {
  const location = useLocation();
  const translate = useTranslate();

  const currentPath = NAV_ITEMS.find(({ href }) =>
    matchPath(href === "/" ? "/" : `${href}/*`, location.pathname),
  )?.href;

  // Check if the app is running as a PWA (standalone mode)
  const isPwa = window.matchMedia("(display-mode: standalone)").matches;
  // Check if it's iOS on the web
  const isWebiOS = /iPad|iPod|iPhone/.test(window.navigator.userAgent);

  return (
    <nav
      aria-label={translate("crm.navigation.label")}
      className="fixed bottom-0 left-0 right-0 z-50 bg-secondary h-14"
      style={{
        // iOS bug: even though viewport is set correctly, the bottom safe area inset is not accounted for
        // So we manually add some padding to avoid the navigation being too close to the home bar
        paddingBottom: isPwa && isWebiOS ? 15 : undefined,
        // We use box-sizing: border-box, so the height contains the padding.
        // To actually increase the padding, we need to increase the height as well
        height:
          "calc(var(--spacing)) * 6" + (isPwa && isWebiOS ? " + 15px" : ""),
      }}
    >
      {/* Scrolls horizontally on narrow screens instead of hiding items. */}
      <div className="flex items-start overflow-x-auto px-1">
        {NAV_ITEMS.map(({ href, Icon, labelKey }) => (
          <NavigationButton
            key={href}
            href={href}
            Icon={Icon}
            label={translate(labelKey, { smart_count: 2 })}
            isActive={currentPath === href}
          />
        ))}
        <CanAccess resource="contacts" action="create">
          <CreateButton />
        </CanAccess>
      </div>
    </nav>
  );
};

const NavigationButton = ({
  href,
  Icon,
  label,
  isActive,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}) => (
  <Link
    to={href}
    className={cn(
      buttonVariants({ variant: "ghost" }),
      "flex-col gap-1 h-auto py-2 px-1 rounded-md w-16 shrink-0",
      isActive ? null : "text-muted-foreground",
    )}
  >
    <Icon className="size-6" />
    <span className="text-[0.6rem] font-medium">{label}</span>
  </Link>
);

const CreateButton = () => {
  const translate = useTranslate();
  const contact_id = useMatch("/contacts/:id/*")?.params.id;
  const [contactCreateOpen, setContactCreateOpen] = useState(false);
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);

  return (
    <>
      <ContactCreateSheet
        open={contactCreateOpen}
        onOpenChange={setContactCreateOpen}
      />
      <NoteCreateSheet
        open={noteCreateOpen}
        onOpenChange={setNoteCreateOpen}
        contact_id={contact_id}
      />
      <TaskCreateSheet
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        contact_id={contact_id}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="default"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full mt-1.5"
              aria-label={translate("ra.action.create")}
            />
          }
        >
          <Plus className="size-7" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onClick={() => {
              setContactCreateOpen(true);
            }}
          >
            {translate("resources.contacts.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onClick={() => {
              setNoteCreateOpen(true);
            }}
          >
            {translate("resources.notes.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onClick={() => {
              setTaskCreateOpen(true);
            }}
          >
            {translate("resources.tasks.forcedCaseName")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
