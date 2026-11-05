# Modernizar el CRM: menos ruido, vidrio acotado

> **Nota agregada después de revisar las 9 capturas.** Este informe se escribió antes de ver las pantallas y de armar el lienzo de propuestas. Los nombres cambian así: A "Mica cálida" es **Vidrio cálido**; B "Grafito cálido" es **Grafito**; D "Control técnico" es **Plano técnico**. "Vidrio claro" es una variante nueva del lienzo; "Papel cálido" y "Marco de vidrio" no se dibujaron. Los tonos del lienzo reemplazan a los de estas tablas. **Recomendación final, que reemplaza a la de este informe:** Plano técnico por defecto y Vidrio cálido como opción oscura (ver `docs/18-pasada-ux.md`).

El CRM se verá moderno por lo que se quita y se ordena, más que por el efecto que se le ponga encima, y casi todo se puede hacer sin tocar base de datos ni permisos. Recomiendo la dirección **"Mica cálida"**: la versión honesta del look de vidrio que le gusta a Ignacio, con foto cálida de fondo y naranja de acento, pero con tablas, ficha y kanban casi opacos. La evidencia no prueba que el vidrio sea ilegible; lo que muestra es que Apple y Microsoft lo sacan de la capa de contenido, y que el gris secundario y el naranja se rompen primero. Además hay un límite técnico duro: el desenfoque en vivo no puede ir en ningún contenedor que envuelva el tablero kanban. Lo que más va a cambiar el día a día es **una sola barra de filtros para kanban y lista**, que no requiere cambios de esquema. La base común (ajustes visuales baratos más la barra de filtros) cuesta unos 2 a 3,5 días y Mica cálida suma 2 a 3 (mis estimaciones), todo por partes y reversible entre demos. **No encontré ningún resultado medido y creíble de un rediseño visual de CRM, así que no hay que prometerle a TekFusion ningún porcentaje.** Paletas provisorias hasta tener el logo y los colores reales.

*Alcance: el cuerpo de este informe no describe las pantallas actuales de TekFusion. "Stock" significa Atomic CRM público (commit `7bd2136`), no el repo de TekFusion, que no se inspeccionó.*

## Lo moderno viene de quitar, no de decorar

Los rediseños recientes van en la misma dirección: la navegación se atenúa, una zona domina y el color queda para el estado. **Son descripciones de los propios fabricantes y opiniones de diseñadores: ningún estudio liga estas señales con "verse viejo".**

| Se ve 2010 o IA básica | Se ve actual | Fuente |
|---|---|---|
| Todo con el mismo peso visual | Un elemento dominante; lo secundario retrocede | [Canatselis](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c) |
| Bordes gruesos y separadores por todos lados | Pocos divisores, suaves | [Linear](https://linear.app/now/behind-the-latest-design-refresh), [Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) |
| Color saturado de adorno | Base neutra; color solo para estado y acción | [HubSpot](https://product.hubspot.com/blog/designing-for-your-next-decade-growth) |
| Tablas con cebra y datos centrados | Montos a la derecha con dígitos de igual ancho, acciones al pasar el mouse | [Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) |
| "Sin datos" a secas | Dice qué pasó y qué hacer | [NN/g, 2021](https://nngroup.com/articles/empty-state-interface-design) |
| Fila de KPI iguales, tarjetas dentro de tarjetas, gradiente morado, borde de color a un lado, todo botón principal | Tamaños según importancia, separar con espacio y tipografía | [Impeccable](https://www.mintlify.com/pbakaus/impeccable/concepts/anti-patterns) |

Dos advertencias: esa lista de Impeccable incluye el glassmorphism como señal de IA, así que el vidrio mal hecho produce el efecto contrario. Y Linear usa Inter, que otros llaman señal de IA ([Linear, 2024](https://linear.app/now/how-we-redesigned-the-linear-ui)): el problema son los valores por defecto sin decidir, no una fuente.

## Vista por vista: qué hacen los mejores

Todo viene de documentación y descripciones escritas; no vi capturas ni usé los productos. La columna derecha es inferencia mía para TekFusion.

| Vista | Qué hacen | Para TekFusion |
|---|---|---|
| **Kanban** | Attio: nombre arriba, atributos reordenables, oculta los vacíos, abre vista previa sin salir del tablero ([doc](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views.md)). Pipedrive: por defecto sube lo que requiere atención ([doc](https://support.pipedrive.com/en/article/deal-card-customization-sorting)). | Tarjeta de 3 a 5 datos: empresa dominante, necesidad en una línea, línea como etiqueta gris, ejecutivo, una señal de tiempo; monto solo si existe. El estado ya lo dice la columna. Encabezado: "Cotizado · 8 · $12.400.000". |
| **Ficha** | HubSpot (beta privada): máximo 5 propiedades en cabecera, 2 botones rápidos, línea de tiempo con filtros ([doc](https://knowledge.hubspot.com/records/understand-the-default-record-layout)). Attio: titular y acciones arriba a la izquierda, eventos automáticos colapsados ([Attio, 2026](https://attio.com/changelog/2026/record-page-redesign)). | Máximo 5 datos arriba y los botones de RF-05. En la línea de tiempo, mensajes a peso completo y eventos automáticos atenuados. Attio pone el panel a la izquierda y HubSpot a la derecha: importa que sea siempre igual. |
| **Lista** | Sin cebra, encabezado fijo, panel lateral en vez de modal ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables), [NN/g, 2022](https://www.nngroup.com/articles/data-tables/)). Carbon usó 48 px y 14 px como estándar ([Carbon v10](https://v10.carbondesignsystem.com/components/data-table/style)). | Filas de 48 px, texto de 14 px. Sin selector de densidad al inicio: sacar columnas ayuda más. |
| **Bandeja WhatsApp** | Konvo (soporte, no CRM): lista, conversación y perfil en tres paneles ([doc](https://docs.konvoai.com/en/articles/13834023-3-0-inbox-overview)). Close: cola única de pendientes ([doc](https://help.close.com/docs/inbox)). | Tres paneles, con las vistas de RF-08 arriba de la lista. Confianza media: un solo producto documentado. |
| **Dashboard** | Una métrica dominante, no una fila de iguales ([SaaSUI](https://www.saasui.design/blog/saas-ui-looks-ai-generated), opinión). Sin fuente primaria de cómo los arman los grandes CRM. | Tamaños distintos según RF-11; ranking solo para gerencia. Layout modular ("bento") solo aquí. La dona del look de vidrio calza con "leads por línea" (3 categorías), no con el embudo. |
| **Alertas** | Close: Entrada, Hecho, Futuro ([doc](https://help.close.com/docs/inbox)). Linear agrupa por tipo ([Linear, 2024](https://linear.app/now/how-we-redesigned-the-linear-ui)). | Campana agrupada por tipo. "Posponer" es la mejora 5 no comprometida de docs/02. |
| **Configuración** | Attio: búsqueda sobre todas las secciones ([Attio](https://attio.com/changelog/2026/changelog-august-25-2026)). | Llevar aquí el importador (RF-15), que en stock está en la barra de deals ([DealList](https://github.com/marmelab/atomic-crm/blob/main/src/components/atomic-crm/deals/DealList.tsx)). |
| **Login** | No encontré evidencia. | Lo que se diga es opinión. A mi juicio es el lugar de menor riesgo para la foto cálida. |

## El vidrio sirve, pero no encima de los datos

| Qué se dice | Qué muestra la evidencia |
|---|---|
| "El vidrio es ilegible" | **No está demostrado.** Las críticas conocidas son revisión experta, sin usuarios ([NN/g, 2025](https://www.nngroup.com/articles/liquid-glass/), [Axess Lab](https://axesslab.com/?p=5111)). No encontré ningún estudio controlado de vidrio esmerilado en trabajo prolongado con datos, ni a favor ni en contra. |
| "La transparencia cuesta" | Sí, pero con estudios de 1995, chicos y sin desenfoque: 0% y 50% de transparencia rindieron parecido y 75-90% fue más lento ([UIST](https://www.research.autodesk.com/app/uploads/2023/03/an-experimental-evaluation-of.pdf_recnlGNHgFB63p2GI.pdf)); otro vio interferencia ya antes del 50% ([CHI](https://www.billbuxton.com/transparency.pdf)). Lo que pesa es fondo y opacidad, y ambos se controlan. |
| Apple | Regla textual: "Don't use Liquid Glass in the content layer"; va en barras, menús y alertas ([HIG](https://developer.apple.com/design/human-interface-guidelines/materials.md)). Tras las críticas agregó opacidad y un control para el usuario hasta junio de 2026 ([9to5Mac](https://9to5mac.com/2026/06/08/apple-updates-liquid-glass-ui-in-ios-27-with-new-slider-to-customize-how-it-looks/)). **Corrigió, no abandonó.** |
| Microsoft | Mica va opaca detrás de todo y toma el fondo una sola vez ([Mica](https://learn.microsoft.com/en-us/windows/apps/design/style/mica)). Acrílico solo en menús y paneles transitorios; nada de texto de color de acento encima; consume GPU ([Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)). |
| "Hay CRM reales así" | Los CRM de vidrio total que encontré son plantillas o conceptos ([ejemplo](https://converge.ai/enter/marketplace/templates/glassmorphic-crm-dashboard-workspace)). Eso no prueba que no exista ninguno. La librería glasscn-ui está archivada ([GitHub](https://github.com/itsjavi/glasscn-ui)). |

**Por qué se ve bien en la captura y falla en el uso.** Contraste calculado con la fórmula WCAG, cuya norma pide 4,5:1 para texto normal (1:1 es invisible, 21:1 es negro sobre blanco). Panel `#141417` sobre distintos fondos:

| Detrás del panel | Opacidad | Texto `#F4F4F5` | Gris `#A1A1AA` | Naranja `#F97316` |
|---|---|---|---|---|
| Zona blanca | 40% | 2,35 | **1,01** | **1,09** |
| Zona blanca | 60% | 4,37 | **1,87** | **1,71** |
| Zona blanca | 90% | 12,76 | 5,47 | 5,00 |
| Foto oscurecida, máximo `#8A5A3C` | 70% | 12,69 | 5,44 | 4,98 |
| Foto oscurecida, máximo `#8A5A3C` | 92% | 15,76 | 6,76 | 6,18 |

Los números blancos grandes aguantan; el gris secundario y el naranja se caen. Desenfocar no salva una zona grande y clara, y la herramienta automática axe no revisa texto sobre imágenes ([Deque](https://dequeuniversity.com/rules/axe/4.4/color-contrast)), así que este cálculo se hace aparte.

**El límite técnico.** La tarjeta que se arrastra en el kanban se posiciona contra la ventana (`position: fixed`) ([hello-pangea](https://github.com/hello-pangea/dnd/blob/main/docs/api/draggable.md)). Si un contenedor que envuelve el tablero tiene `backdrop-filter` (desenfoque en vivo), `transform` o `filter`, pasa a ser su referencia ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Containing_block)) y la tarjeta puede quedar corrida del cursor. No se probó arrastrando; por eso va una captura a medio arrastre en cada revisión.

**Rendimiento.** No hay una medición seria para PC de oficina; lo publicado son anécdotas, como modales lentos en shadcn sin GPU dedicada ([#327](https://github.com/shadcn-ui/ui/issues/327)). El costo real se mide en los computadores de TekFusion.

**La receta usable** (propuesta mía sobre esas reglas; falta probarla):

| Capa | Tratamiento |
|---|---|
| Fondo | Una foto ya desenfocada y oscurecida como imagen fija, con techo `#8A5A3C`. Sin desenfoque en vivo y sin fondos animados. Ideal: foto propia de TekFusion. |
| Navegación y tarjetas KPI | Panel a ~70%, sobre esa imagen fija |
| Tablas, ficha, columnas kanban | 92-100% ([un proveedor de estas plantillas recomienda lo mismo](https://superdesign.dev/styles/glassmorphism/dashboard)) |
| Tarjeta kanban | Sólida |
| Menús, desplegables, modales | Desenfoque real de 8 a 16 px; más opacidad en modales con formularios |
| Prohibido | Desenfoque en `main` (el contenedor principal), tablero, columnas, tarjetas o filas |
| Interruptor | Un atributo apaga todo y deja superficies sólidas. Hace falta dentro de la app porque Safari no respeta la preferencia del sistema y Firefox la trae apagada ([Can I Use](https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency)) |

**Lo que Ignacio conserva:** ánimo oscuro y cálido, números KPI grandes con valores cortos, naranja como único acento, foto en dashboard y login. **Lo que tiene que aceptar:** en las pantallas de los ejecutivos el vidrio casi no se va a notar.

**Tres reglas para el naranja** (cálculo propio y Carbon):
- Botón naranja con texto oscuro (6,56:1), no blanco (2,80:1).
- Nada de texto chico naranja sobre superficies translúcidas.
- La urgencia va en rojo, porque Carbon reserva el naranja para advertencias ([Carbon](https://carbondesignsystem.com/patterns/status-indicator-pattern/)).

## Cinco direcciones y una recomendación

**Todas las paletas son provisorias** y se cambian desde las variables centrales de diseño ("tokens": un valor, como el color primario, que al cambiarlo cambia en todas las pantallas). En B, C y D, texto, gris secundario (`#A8A29E`, `#57534E`, `#4B5563`) y naranja superan 4,5:1 según mi cálculo; en C y D el botón naranja lleva texto blanco.

| Dirección | Paleta provisoria | Tipografía | Superficies | Densidad |
|---|---|---|---|---|
| **A. Mica cálida** (vidrio honesto) | Grafito `#141417` sobre foto con techo `#8A5A3C`; naranja `#F97316` | Hanken Grotesk | Según la receta de arriba | 48 px, mínimo 14 px en tablas |
| **B. Grafito cálido** | `#1A1816`, `#24211E`; texto `#EDEAE6`; naranja `#FB923C` | Instrument Sans | Sin foto ni sombras; profundidad por pasos de luz | 40-48 px, 14 px |
| **C. Papel cálido** | `#FAF8F5`, blanco; texto `#1C1917`; naranja `#C2410C` | Figtree | Planas, divisores suaves, sin sombra en reposo | 48 px, 14 px |
| **D. Control técnico** | Acero `#F1F3F2`; texto `#14181C`; naranja señal `#B8400B` | IBM Plex Sans | Radios de 2-4 px, líneas finas, color saturado solo para estado | 40-48 px, 14 px |
| **E. Marco de vidrio** | Lienzo `#FAF8F5`; barra `#141417` al 90% | Hanken Grotesk | Trabajo claro; barra oscura con desenfoque de 12 px sobre lo que pasa debajo | 48 px, 14 px |

| Dirección | De dónde viene | Para 6 horas al día (juicio) | Esfuerzo extra |
|---|---|---|---|
| **A** | [Mica](https://learn.microsoft.com/en-us/windows/apps/design/style/mica) y [Apple](https://developer.apple.com/design/human-interface-guidelines/materials.md) | Respeta el gusto de Ignacio. Exige control de contraste; la foto pierde gracia y su tinte queda | 2-3 días |
| **B** | [Linear](https://linear-web.pages.dev/changelog/2026-03-12-ui-refresh), [análisis de terceros](https://www.buildmvpfast.com/blog/linear-aesthetic-tokens-density-keyboard-first-ux-2026) | Sobrio y sin riesgo de vidrio, pero ya es salida típica de IA | 0,5-1 día |
| **C** | [Attio](https://styles.refero.design/style/08c8700c-f278-42bc-812e-f60dc6ce996e) como estructura (es blanco frío; lo cálido es idea mía), [HubSpot](https://product.hubspot.com/blog/designing-for-your-next-decade-growth) | La mejor evidencia de lectura; la primera impresión menos llamativa | 0,5 día |
| **D** | [Datos densos, estilo sala de control](https://trends.daisyui.com/trend/data-dense-utilitarian-ui/), [Carbon](https://carbondesignsystem.com/elements/typography/overview/) | La más propia de válvulas y tuberías y la más distinta del look de IA; puede sentirse fría | 1-2 días |
| **E** | Propuesta mía; no encontré producto documentado | Lectura de modo claro y vidrio en el lugar correcto, pero sutil; el salto oscuro-claro no está probado | 1 día |

"Esfuerzo extra" se suma a la base común; son estimaciones mías, sin ver el repo de TekFusion. Tipografía: evitar DM Sans en montos, porque su versión de Fontsource no tiene dígitos de igual ancho. Cambiar la fuente toma 30 minutos, pero nada prueba que los usuarios lo noten.

**Mi recomendación: A como identidad, con la disciplina de datos de D** (dígitos alineados, etiquetas neutras, color solo para estado), **y C como gemelo claro por usuario**. Si A falla en contraste o rendimiento, cae a B apagando la foto.

El argumento es práctico: A es la más cercana al gusto de Ignacio que además se defiende con las reglas de Apple y Microsoft. Pero seamos honestos: si se decidiera solo por evidencia de lectura, ganaría C. En personas con visión normal el modo claro rinde mejor, sobre todo con letra chica, sin diferencia medida en fatiga ([NN/g, 2020](https://www.nngroup.com/articles/dark-mode/)). Y la preferencia declarada muchas veces no coincide con el mejor rendimiento ([While & Sarvghad, 2024](https://www.arxiv.org/pdf/2409.10841)). Por eso el modo claro es parte de la recomendación, no un extra: Ignacio mira el CRM en la demo, pero son los ejecutivos quienes pasan ahí 6 horas. Si no existiera el apego al vidrio, yo elegiría D.

**Cómo decidir:** generar A, C y D con datos falsos sobre las mismas cuatro pantallas (lista, kanban, ficha, dashboard), en una grilla de capturas. Después, una semana de uso con los dos ejecutivos en staging.

| Demo | Qué se muestra (ajustar tras la revisión de pantallas actuales) |
|---|---|
| 1 | Tokens, fuente, ancho, barra superior, formato CLP, colores de estado |
| 2 | Barra de filtros, pestañas, conteo, estados vacíos |
| 3 | Tarjeta kanban, jerarquía de ficha, lista |
| 4 | Foto y vidrio con interruptor, dashboard |

## Una sola barra de filtros para kanban y lista

```
(vista de gerencia)
Pestañas:  Abiertos 34 | Sin asignar 2 | Sin contacto 24 h 3 | Cotizados | Todos   [Kanban | Lista]
Barra:     [Buscar empresa, contacto o teléfono] [Línea ▾] [Ejecutivo ▾] [Canal ▾] [Estado ▾] [Fecha ▾]
Conteo:    23 de 187 leads · Limpiar filtros                       [Exportar 23]    [+ Nuevo lead]
```

| Regla | Por qué |
|---|---|
| Cinco desplegables siempre visibles, sin "agregar filtro" ni "Avanzado" | Las opciones son pocas y conocidas. Un panel lateral le quita ancho al kanban; un constructor esconde los filtros y habla raro ("es uno de") ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)) |
| El control muestra su valor: "Línea: Válvulas ×", "Nuevo +1" | Mostrar solo "Filtros (3)" rindió mal en pruebas de e-commerce ([Baymard](https://baymard.com/research-articles/how-to-design-applied-filters)). Usar el propio control como resumen va más allá de lo que probaron: hay que testearlo |
| × por filtro y un "Limpiar filtros" | [Baymard](https://baymard.com/research-articles/how-to-design-applied-filters) |
| Mismo estado para kanban, lista, conteo y CSV | Pipedrive usa el mismo filtro en lista y pipeline ([doc](https://support.pipedrive.com/article/filtering)); en Jira hay queja cuando no ([Atlassian](https://community.atlassian.com/forums/Jira-questions/Feature-request-board-filters-do-not-apply-to-the-List-view/qaq-p/3184796)). Es práctica fuerte, **no estándar**: Notion y Airtable lo hacen por vista |
| Pestañas fijas en código, máximo 5; al tocar un filtro pasa a "Personalizado" | [Shopify](https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/index-filters); el tope de 5 de [HubSpot](https://knowledge.hubspot.com/records/manage-saved-views-in-the-updated-index-page) es decisión de producto, no ciencia |
| Sin botón "Aplicar"; la búsqueda espera 300 ms | [Shopify](https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/index-filters) |

**Pestañas por rol (propuesta; los nombres los confirma TekFusion).** Ejecutivo: Mis abiertos · Sin contacto 24 h · Cotizados · Sin asignar (si se confirma docs/08, ver decisiones). Gerencia: la del esquema. Lector: Abiertos · Todos. Conteo solo donde pide acción. A los ejecutivos se les ocultan el filtro "Ejecutivo" y "Exportar".

**Qué requiere cambio de esquema** (esquema: la estructura de tablas de la base):

| Función | Dónde vive | ¿Cambio de esquema o permisos? |
|---|---|---|
| Filtros activos, link compartible, botón atrás | Dirección de la página (stock) | No |
| Volver a los últimos filtros | Memoria del navegador (stock) | No |
| Pestañas por rol | Código | No |
| "Sin contacto 24 h" | Regla sobre campos existentes (docs/05, docs/06) | No |
| Conteos en pestañas | Consulta de lectura adicional | No |
| Kanban o lista, densidad | Memoria del navegador | No |
| "Copiar enlace" y favoritos del navegador | Dirección de la página | No. **Es mi sustituto recomendado de vistas guardadas** |
| Vistas con nombre, en un solo navegador | Memoria del navegador (ya hay código stock) | No, pero se pierden al cambiar de equipo; [Shopify](https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/index-filters) lo desaconseja |
| Vistas con nombre, en varios equipos o compartidas | Tabla nueva y reglas de permisos | **Sí. Fuera de alcance; se cotiza aparte** |

**Trampas a resolver** (la mayoría leídas en el código de stock; hay que confirmarlas en el repo de TekFusion):
- **Dos sistemas de filtros en stock.** Deals tiene barra arriba; Contactos y Empresas, panel lateral. Stock tampoco trae tabla de deals: la lista hay que construirla, reusando la barra.
- **Topes silenciosos.** Kanban hasta 100 tarjetas ([DealList](https://github.com/marmelab/atomic-crm/blob/main/src/components/atomic-crm/deals/DealList.tsx)) y CSV hasta 1.000 ([ExportButton](https://github.com/marmelab/atomic-crm/blob/main/src/components/admin/export-button.tsx)). A unos 100 leads al mes, el kanban lo pasa en cosa de un mes si incluye cerrados. Sugiero Ganado y Perdido colapsados o solo del mes, sin dejar de ser destino de arrastre, y aviso si hay recorte.
- **Orden y paginación se contagian.** Se guardan junto con los filtros y pasarían de la tabla al kanban. Solución: dos listas con memoria separada que compartan solo los filtros ([react-admin](https://marmelab.com/react-admin/List.html)).
- **Estado en el kanban.** Ocultarlo haría que la barra cambie entre vistas, que es justo la queja. Prefiero dejarlo: lo elegido a columna completa y lo demás colapsado a nombre y conteo ([Attio](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views.md)).
- **Exportar es solo de gerencia y queda registrado** en `actividades` (docs/08, aunque RF-04 no lo menciona). El botón stock no basta.
- **Datos en la dirección.** El texto buscado queda en la dirección de la página y hay Sentry en el frontend (docs/08): revisar que no envíe nombres de clientes.

**Que se entienda sin explicación:**

| Elemento | Propuesta |
|---|---|
| Estados | Nuevo azul, Contactado azul grisáceo, Cotizado violeta, Ganado verde, **Perdido gris oscuro**, Archivado gris claro. Siempre con texto y punto, porque el color solo no basta ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)) |
| Rojo | Reservado para "Sin contacto 24 h", vencidos y WhatsApp desconectado. Así rojo siempre significa actuar |
| Línea y Canal | Etiqueta gris, sin color: es descripción, no estado ([Atlassian](https://atlassian.design/components/lozenge/usage)) |
| Etiquetas de color | Texto tono 800 sobre fondo 100 da 6,5:1; el tono 600 da 3:1 y falla (cálculo con Tailwind v3; recalcular con los colores finales) |
| Vocabulario | Una palabra por concepto, también en el CSV: "Ejecutivo", "Canal", "Sin línea" en vez de `indeterminada` |
| Vacíos | Separar "aún no hay leads", "ningún lead coincide con estos filtros" y "cargando" ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)) |
| Búsqueda y acción | Caja de búsqueda visible; Ctrl+K opcional, sin evidencia de que ayude a no técnicos ([Appleton](https://maggieappleton.com/command-bar), opinión). Un solo botón lleno por pantalla: es convención, no dato medido |

## Seis skills alcanzan, y ninguna impone metodología

**Las instalaciones no se ejecutaron, y las skills no se probaron contra este CRM;** solo se leyeron sus repos. La evidencia independiente es escasa: en una comparación de un proveedor con interés propio, un agente sin skills igualó el diseño de una app existente ([Superdesign](https://superdesign.dev/blog/design-skills-reviewed)). Eso apoya instalar poco. `agent-skills` sigue siendo la única metodología y `frontend-design` ya está en docs/14, así que son cinco instalaciones nuevas.

| Skill | Repo | Licencia | Trabajo | Riesgo y ajuste |
|---|---|---|---|---|
| `frontend-design` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Apache-2.0 | Dirección estética, una vez por decisión | Empuja a riesgo visual; el encargo manda. Se actualiza sola si no se fija |
| `shadcn` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn) | MIT | Componentes y tokens | **Corre `npx shadcn@latest` al cargar y preaprueba sus subcomandos**, que pueden pisar componentes. Fijar versión; fuera del loop nocturno |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | MIT (según README; sin archivo LICENSE en la raíz) | Auditoría de código con archivo y línea | **Baja reglas desde `main` en cada uso**: pueden cambiar sin revisión. Usar copia local fijada |
| `accessibility` | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/tree/main/skills/accessibility) | MIT | Accesibilidad sobre la pantalla real | Sugiere una instalación global de axe: no hacerla |
| `review-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/main/skills/review-animations) | MIT | Revisar movimiento; solo corre si se invoca | Bajo; aporta poco en un CRM ([prueba chica](https://www.webreactiva.com/blog/skills-emil-kowalski)). `break-ui` es un reemplazo creíble |
| `kpi-dashboard-design` | [wshobson/agents](https://github.com/wshobson/agents/tree/main/plugins/business-analytics/skills/kpi-dashboard-design) | MIT | Qué mostrar en el dashboard | Es de diseño, no de código, y es la más débil de las seis. Instalar solo esa, sin el marketplace |

Socket marcó advertencia en `shadcn` y `web-design-guidelines` ([skills.sh](https://skills.sh/shadcn/ui/shadcn)), sin causa visible. Ninguna de las seis instala hooks (código que corre solo). **Ninguna cubre densidad, tablas o kanban para un CRM**: eso va en un `DESIGN.md` corto del proyecto. Conviene también elegir WCAG 2.2 AA como norma única, porque hoy `accessibility` apunta a 2.2 y `frontend-ui-engineering` a 2.1.

| Descartada | Motivo |
|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | La mejor alternativa, pero sus hooks corren en cada edición, incluso de noche, y puede descargar un motor compilado. Duplica `frontend-design` |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Agrega Python y skills ajenas (banners, slides). "Colores nuevos, mismo layout de IA" ([Velox](https://veloxthemes.com/blog/claude-code-skills-web-design), también con interés comercial) |
| [Taste](https://github.com/Leonxlnx/taste-skill) | Hecha para sitios corporativos; sus reglas pelean con una interfaz densa |
| [Superdesign](https://github.com/superdesigndev/superdesign-skill) | Requiere cuenta y envía archivos a un servicio externo; choca con las reglas de datos |
| [AccessLint](https://github.com/AccessLint/skills) | Paquetes `@latest` de un proveedor chico y una segunda conexión de navegador. Reserva si hacen falta hallazgos de motor |
| [`shadcn-syntax-chart`](https://github.com/OpenAEC-Foundation/shadcn-ui-claude-skill-package/blob/main/skills/source/shadcn-syntax/shadcn-syntax-chart/SKILL.md), [`tailwind-design-system`](https://github.com/wshobson/agents/blob/main/plugins/frontend-mobile-development/skills/tailwind-design-system/SKILL.md) | Recharts, otro stack; duplica lo que ya está |

Reservas: [`improve-ui`](https://github.com/ibelick/ui-skills/blob/main/skills/improve-ui/SKILL.md), una vez que exista `DESIGN.md`, y [`break-ui`](https://github.com/emilkowalski/skills/blob/main/skills/break-ui/SKILL.md), para nombres largos y casos vacíos.

**Hechos de la base (`7bd2136`):** los componentes usan **Base UI** (`base-vega`), no Radix, así que un ejemplo con `asChild` hay que adaptarlo a `render` ([components.json](https://github.com/marmelab/atomic-crm/blob/main/components.json)). El kanban usa **`@hello-pangea/dnd`** y el gráfico, **`@nivo/bar`**, no Recharts ([package.json](https://github.com/marmelab/atomic-crm/blob/main/package.json)). **No se inspeccionó el repo de TekFusion.** Comparado con el commit de partida `251d3cc`, esas carpetas casi no cambian, pero sus ediciones posteriores son desconocidas: Claude Code debe confirmar estos archivos primero.

Comandos armados desde los README, **no ejecutados y sin probar en Windows** (probar uno primero; revisar el código antes, regla de docs/14):

```powershell
$env:DISABLE_TELEMETRY = "1"
claude plugin install frontend-design@claude-plugins-official
npx skills@1.7.6 add shadcn-ui/ui@8a3536678a528cc012b9e62484290e79d0be410f --skill shadcn -a claude-code --copy
npx skills@1.7.6 add vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 --skill web-design-guidelines -a claude-code --copy
npx skills@1.7.6 add addyosmani/web-quality-skills@afa8da942115f2961fdbfa80807ea0b232ff6c00 --skill accessibility -a claude-code --copy
npx skills@1.7.6 add emilkowalski/skills@c8a79627b59d72d764d6ab6f2c87c09a48169833 --skill review-animations -a claude-code --copy
npx skills@1.7.6 add wshobson/agents@4bde3168b43c0655c4d00ea2726e631719908a6d --skill kpi-dashboard-design -a claude-code --copy
```

## Casi todo el cambio visual cuesta horas, no semanas

Los esfuerzos son estimaciones mías, leídas del código público; nada se ejecutó en la aplicación.

| Palanca | Dónde | Esfuerzo | Riesgo o nota |
|---|---|---|---|
| **Barato** | | | |
| Colores y radios | [`src/index.css`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/index.css) | 1-2 h | Bajo. Es lo que hace intercambiable la paleta |
| Fuente | `index.css`, `index.html` | 30 min | Bajo. También cambiar `lang="en"` a `es-CL` |
| Ancho de contenido | [`Layout.tsx`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/layout/Layout.tsx) | 5 min | Bajo; columnas de 237 a 254 px en pantalla de 1366 |
| Barra superior | [`Header.tsx`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/layout/Header.tsx) | 1 h | No sacar `CanAccess`: decide quién ve qué menú |
| Densidad | Reglas CSS por `data-slot` | 1-2 h | Medio si se aplica global |
| Gráfico | [`DealsChart.tsx`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/dashboard/DealsChart.tsx) | 1-2 h | Colores fijos en código. No probado: nivo con variables de color; quizás haya que usar hexadecimales |
| Formato CLP | 4 usos de `"en-US"` y el eje en `k` | 1-2 h | Un solo formateador; `$12,5 M` en vez de "12500k" |
| Tarjeta y columna kanban | [`DealCard`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/deals/DealCard.tsx), [`DealColumn`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/deals/DealColumn.tsx) | 2-4 h | No tocar las propiedades `provided.*`. Agregar altura mínima a columnas vacías |
| Vidrio en marco y menús | Utilidad CSS y `data-slot` | 2-3 h | Con interruptor; nunca en `main` |
| **Medio** | | | |
| Barra de filtros compartida | Componente nuevo con `useListContext` | 0,5-1,5 días | Ver trampas de arriba |
| Menú lateral o riel | Propiedad `layout` de [`CRM.tsx`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/root/CRM.tsx) | 0,5-1 día | También reemplaza el layout móvil. Quita ancho al kanban (abajo) |
| Dashboard | [`Dashboard.tsx`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/dashboard/Dashboard.tsx) | 1-2 días | Bajo |
| Ficha como página o panel | [`DealShow`](https://github.com/marmelab/atomic-crm/blob/7bd2136a270a1374226b69a50892a3bc83fa6d85/src/components/atomic-crm/deals/DealShow.tsx) es un diálogo | 1-3 días | Medio; toca rutas |
| **Caro o a evitar en marcha blanca** | | | |
| `shadcn apply` completo | Línea de comandos | Incierto | **Alto: reinstala componentes** ([changelog](https://ui.shadcn.com/docs/changelog/2026-04-shadcn-apply)). Usar tweakcn o el generador solo para sacar colores |
| Pasar de nivo a Recharts | Dependencia nueva | ~1 día por tipo | Segundo stack de gráficos sin ganancia clara |
| Cambiar librería de arrastre | [`package.json`](https://github.com/marmelab/atomic-crm/blob/main/package.json) | Días | Cero ganancia visual |
| Scroll doble en kanban | [Solo admite un padre con scroll](https://github.com/hello-pangea/dnd/blob/main/docs/api/droppable.md) | Rehacer | Elegir vertical por columna u horizontal, no ambos |
| Animar transiciones con `transform` alrededor del tablero | `main` | Rompe el arrastre | Prohibido |

**Trampa en la documentación:** Atomic documenta las propiedades `lightTheme` y `darkTheme` ([docs](https://marmelab.com/atomic-crm/doc/developers/customizing/)), pero al buscar en todo el repo ningún código las consume. Hasta su skill `shadcn-customization` las sugiere. Hay que decirle a Claude Code que edite tokens.

**Navegación y ancho del kanban** (5 columnas a 1366 px, cálculo propio; el monitor real es desconocido): barra superior sin tope, 254 px por columna; riel de íconos de 48 px, 244; riel de 72 px con texto bajo el ícono, 240; stock, 237; lateral de 256 px, ~205. NN/g pide etiqueta visible junto al ícono, aunque admite solo íconos en apps de uso diario ([íconos](https://www.nngroup.com/articles/icon-usability/), [navegación](https://www.nngroup.com/articles/vertical-nav/)). Sugiero el riel con texto (propuesta mía): mantiene el look y cumple eso.

**Para comparar sin arriesgar:** con `html[data-theme]` y `?theme=x` en la dirección se cambia de tema sin bifurcar código (compiló aislado; falta probarlo en navegador). `npm run dev:demo` corre sin Supabase y Playwright ya está instalado. **Ojo:** el plan lista borrar `demo/` en Fase 1 (docs/09); si aún existe, conviene postergarlo hasta terminar la pasada visual. Pantallas propias como WhatsApp no tienen datos en demo: para esas, `seed.sql` en local. Nunca datos reales.

## Decisiones que no son del código

| Decisión | De quién | Mi sugerencia |
|---|---|---|
| Dirección visual | Ignacio y TekFusion | A con gemelo claro, tras ver la grilla |
| Modo claro y oscuro por usuario | Ignacio: no está en docs/02; stock trae el botón | Mantenerlo y confirmar que sigue en el repo |
| Modo por defecto de los ejecutivos | Ignacio y ejecutivos | Claro, si hay que elegir uno; que cada uno pueda cambiarlo |
| Ajuste "superficies sólidas" | Ignacio: funcionalidad nueva y chica | Sí, en el navegador; es el freno de emergencia |
| RF-01 dice que el ejecutivo ve solo sus leads; docs/08 le deja ver y "tomar" los sin asignar | Ignacio | Aclarar antes de fijar pestañas y el denominador del conteo |
| Pipeline y Leads como una página con selector (docs/09 los separa) | Ignacio | Una página; si siguen separados, deben leer los mismos filtros |
| Pestañas por rol, nombres y "Copiar enlace" | TekFusion e Ignacio | Validar; no están explícitos en docs/02 y no tocan datos |
| Vistas guardadas con nombre, selector de densidad | Ignacio | No por ahora; lo primero se cotizaría |
| Logo y colores reales | TekFusion (pendiente) | Entran por tokens; si no son cálidos, también cambian foto y acento |

## Lo que no sabemos

| Vacío | Consecuencia |
|---|---|
| **Ningún resultado medido y creíble de un rediseño visual de CRM.** Salesforce, HubSpot y Linear no publican cifras. El "30%" de [Evoke](https://www.evoketechnologies.com/?p=69132) no tiene base ni método y no dice ser un CRM; las cifras de [Lollypop](https://lollypop.design/blog/2026/march/enterprise-ux-modernization-roi-2026/?p=24423) no tienen fuente | **No prometer ningún porcentaje a TekFusion.** Si se quiere evidencia, medir tareas propias |
| Ningún estudio de vidrio esmerilado en uso prolongado | No se puede afirmar que funcione ni que falle en 6 horas |
| Ninguna medición de desenfoque en PC de oficina; hardware, monitores y luz de TekFusion desconocidos | Medir tiempos por cuadro con Chrome, una tabla de 200+ filas y kanban, con y sin vidrio |
| Modo claro y oscuro: estudios chicos o antiguos; ninguno de 6 horas en CRM | La preferencia por el claro es inclinación, no certeza |
| No vi capturas ni usé los productos; no pude verificar si Linear o Attio usan desenfoque en su web | Abrir a mano las [galerías](https://www.saasui.design/pattern/table/attio) antes de copiar medidas |
| No encontré la publicación viral de Ignacio ni un CRM de vidrio con datos reales | Un prototipo con datos falsos es mejor evidencia que cualquier fuente |
| Filtros, tarjetas y pestañas sin probar con usuarios | Prueba de cinco minutos con los dos ejecutivos en staging |
| Sin probar: arrastre con vidrio, nivo con variables de color, temas en navegador, determinismo de capturas | Primeras tareas de Claude Code, una a la vez |
| Repo de TekFusion no inspeccionado; pantallas actuales no revisadas (se revisan por separado) | Todo esfuerzo y ubicación de archivo es provisorio |
| Evidencia sobre skills: escasa y con conflictos de interés | Instalar de a una; desinstalar si hace ruido (docs/14) |

**Aparte:** el único repo visible con ese nombre, `Ignacioliras/tekfusion-crm`, es **público** y parece ser un proyecto anterior distinto, de febrero de 2026. docs/08 exige repo privado. Vale la pena revisar que no tenga nada sensible y que no se confunda con el real.

## Conclusión

La discusión sobre el vidrio es más chica de lo que parece. En las pantallas donde los ejecutivos pasan el día, las cinco direcciones comparten lo esencial: superficies casi opacas, jerarquía clara y color solo para estado. A y B ahí son casi idénticas, y pasar de una a otra es apagar una foto. Por eso conviene no gastar demos debatiendo el look y usarlas para ver pantallas.

En vez de prometer porcentajes, a TekFusion se le puede comprometer lo que sí se puede comprobar: el conteo del kanban, la lista y el CSV coinciden, ningún texto baja de 4,5:1 contra el punto más claro del fondo, el arrastre sigue al cursor, y el vidrio se apaga con un interruptor. Son criterios que Ignacio puede revisar sin leer una línea de código.
