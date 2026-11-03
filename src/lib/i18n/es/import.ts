import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// CSV import (data_import) and JSON import (import).
export const importMessages: PartialCrmMessages = {
  crm: {
    data_import: {
      button: "Importar CSV",
      complete:
        "Importación terminada. Se importaron %{importCount} registros, con %{errorCount} errores",
      csv_file: "Archivo CSV",
      error:
        "No se pudo importar este archivo. Revisa que sea un CSV válido.",
      in_progress: "Importación en curso…",
      progress:
        "Se importaron %{importCount} / %{rowCount} registros, con %{errorCount} errores.",
      remaining_time: "Tiempo restante estimado:",
      resource: "Recurso",
      sample_download: "Descargar CSV de ejemplo",
      sample_hint: "Este es un CSV de ejemplo que puedes usar como plantilla",
      start: "Iniciar importación",
      stop: "Detener importación",
      stopped:
        "Importación detenida. Se importaron %{importCount} registros, con %{errorCount} errores",
      title: "Importar datos",
      report: {
        title: "Resultado de la importación",
        created: "Creados",
        duplicates: "Duplicados",
        errors: "Errores",
        line: "Línea",
        kind: "Tipo",
        reason: "Motivo",
        close: "Cerrar",
        kinds: {
          duplicate: "Duplicado",
          error: "Error",
        },
        reasons: {
          missing_name: "El lead no tiene nombre",
          invalid_email: "Correo no válido: %{value}",
          invalid_phone: "Teléfono no válido: %{value}",
          unknown_business_line: "Línea de negocio desconocida: %{value}",
          unknown_stage: "Etapa desconocida: %{value}",
          unknown_sales: "No hay un usuario activo con el correo %{value}",
          duplicate: "El contacto ya tiene un lead activo: %{lead}",
          refused: "La base de datos rechazó la fila",
        },
      },
    },
    import: {
      action: {
        download_error_report: "Descargar el reporte de errores",
        import: "Importar",
        import_another: "Importar otro archivo",
      },
      error: {
        unable: "No se pudo importar este archivo.",
      },
      idle: {
        description_1:
          "Puedes importar usuarios, empresas, contactos, notas y tareas.",
        description_2:
          "Los datos deben venir en un archivo JSON con la estructura de este ejemplo:",
      },
      status: {
        all_success: "Todos los registros se importaron correctamente.",
        complete: "Importación terminada.",
        failed: "Fallidos",
        imported: "Importados",
        in_progress:
          "Importación en curso: no salgas de esta página.",
        some_failed: "Algunos registros no se importaron.",
        table_caption: "Estado de la importación",
      },
      title: "Importar desde JSON",
    },
  },
};
