import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Companies.
export const companiesMessages: PartialCrmMessages = {
  resources: {
    companies: {
      name: "Empresa |||| Empresas",
      forcedCaseName: "Empresa",
      fields: {
        name: "Nombre de la empresa",
        website: "Sitio web",
        linkedin_url: "URL de LinkedIn",
        phone_number: "Teléfono",
        created_at: "Creada el",
        nb_contacts: "Número de contactos",
        revenue: "Facturación",
        sector: "Sector",
        size: "Tamaño",
        tax_identifier: "RUT",
        address: "Dirección",
        city: "Ciudad",
        zipcode: "Código postal",
        state_abbr: "Región",
        country: "País",
        description: "Descripción",
        context_links: "Enlaces de contexto",
        sales_id: "Ejecutivo",
      },
      empty: {
        description: "Parece que tu lista de empresas está vacía.",
        title: "No se encontraron empresas",
      },
      import: {
        title: "Importar empresas",
      },
      field_categories: {
        contact: "Contacto",
        additional_info: "Información adicional",
        address: "Dirección",
        context: "Contexto",
      },
      action: {
        create: "Crear empresa",
        edit: "Editar empresa",
        new: "Nueva empresa",
        show: "Ver empresa",
      },
      added_on: "Agregada el %{date}",
      followed_by: "Seguida por %{name}",
      followed_by_you: "La sigues tú",
      no_contacts: "Sin contactos",
      nb_contacts: "%{smart_count} contacto |||| %{smart_count} contactos",
      nb_deals: "%{smart_count} lead |||| %{smart_count} leads",
      sizes: {
        one_employee: "1 empleado",
        two_to_nine_employees: "2 a 9 empleados",
        ten_to_forty_nine_employees: "10 a 49 empleados",
        fifty_to_two_hundred_forty_nine_employees: "50 a 249 empleados",
        two_hundred_fifty_or_more_employees: "250 o más empleados",
      },
      autocomplete: {
        create_error: "Ocurrió un error al crear la empresa",
        create_item: "Crear %{item}",
        create_label: "Escribe para crear una empresa nueva",
      },
    },
  },
};
