INSERT INTO favicons_excluded_domains (domain) VALUES
    ('gmail.com'),
    ('yahoo.com'),
    ('hotmail.com'),
    ('aol.com'),
    ('hotmail.co.uk'),
    ('hotmail.fr'),
    ('msn.com'),
    ('yahoo.fr'),
    ('wanadoo.fr'),
    ('orange.fr'),
    ('comcast.net'),
    ('yahoo.co.uk'),
    ('yahoo.com.br'),
    ('yahoo.co.in'),
    ('live.com'),
    ('rediffmail.com'),
    ('free.fr'),
    ('gmx.de'),
    ('web.de'),
    ('yandex.ru'),
    ('ymail.com'),
    ('libero.it'),
    ('outlook.com'),
    ('uol.com.br'),
    ('bol.com.br'),
    ('mail.ru'),
    ('cox.net'),
    ('hotmail.it'),
    ('sbcglobal.net'),
    ('sfr.fr'),
    ('live.fr'),
    ('verizon.net'),
    ('live.co.uk'),
    ('googlemail.com'),
    ('yahoo.es'),
    ('ig.com.br'),
    ('live.nl'),
    ('bigpond.com'),
    ('terra.com.br'),
    ('yahoo.it'),
    ('neuf.fr'),
    ('yahoo.de'),
    ('alice.it'),
    ('rocketmail.com'),
    ('att.net'),
    ('laposte.net'),
    ('facebook.com'),
    ('bellsouth.net'),
    ('yahoo.in'),
    ('hotmail.es'),
    ('charter.net'),
    ('yahoo.ca'),
    ('yahoo.com.au'),
    ('rambler.ru'),
    ('hotmail.de'),
    ('tiscali.it'),
    ('shaw.ca'),
    ('yahoo.co.jp'),
    ('sky.com'),
    ('earthlink.net'),
    ('optonline.net'),
    ('freenet.de'),
    ('t-online.de'),
    ('aliceadsl.fr'),
    ('virgilio.it'),
    ('home.nl'),
    ('qq.com'),
    ('telenet.be'),
    ('me.com'),
    ('yahoo.com.ar'),
    ('tiscali.co.uk'),
    ('yahoo.com.mx'),
    ('voila.fr'),
    ('gmx.net'),
    ('mail.com'),
    ('planet.nl'),
    ('tin.it'),
    ('live.it'),
    ('ntlworld.com'),
    ('arcor.de'),
    ('yahoo.co.id'),
    ('frontiernet.net'),
    ('hetnet.nl'),
    ('live.com.au'),
    ('yahoo.com.sg'),
    ('zonnet.nl'),
    ('club-internet.fr'),
    ('juno.com'),
    ('optusnet.com.au'),
    ('blueyonder.co.uk'),
    ('bluewin.ch'),
    ('skynet.be'),
    ('sympatico.ca'),
    ('windstream.net'),
    ('mac.com'),
    ('centurytel.net'),
    ('chello.nl'),
    ('live.ca'),
    ('aim.com'),
    ('bigpond.net.au'),
    ('online.de'),
    ('apple.com');

-- =====================================================================
-- Seed ficticio de TekFusion (solo local / staging). Ningún dato es real:
-- empresas, personas, RUT y teléfonos son inventados; dominios .example.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuarios: auth.users -> trigger handle_new_user crea la fila en sales.
-- El primer usuario queda como administrator; los siguientes necesitan
-- una fila en user_invitations o el trigger rechaza el alta.
-- Contraseña local de todos: demo-tekfusion
-- Roles (sales.role): Andrea gerencia, Camila y Diego ejecutivos, Pablo lector.
-- ---------------------------------------------------------------------
do $$
declare
    u record;
begin
    for u in
        select * from (values
            ('a0000000-0000-4000-8000-000000000001'::uuid, 'andrea.soto@tekfusion-demo.cl',   'Andrea', 'Soto',    1),
            ('a0000000-0000-4000-8000-000000000002'::uuid, 'camila.rojas@tekfusion-demo.cl',  'Camila', 'Rojas',   2),
            ('a0000000-0000-4000-8000-000000000003'::uuid, 'diego.munoz@tekfusion-demo.cl',   'Diego',  'Muñoz',   3),
            ('a0000000-0000-4000-8000-000000000004'::uuid, 'pablo.herrera@tekfusion-demo.cl', 'Pablo',  'Herrera', 4)
        ) as t(id, email, first_name, last_name, ord)
        order by ord
    loop
        if u.ord > 1 then
            insert into public.user_invitations (user_id) values (u.id);
        end if;

        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) values (
            '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
            u.email, extensions.crypt('demo-tekfusion', extensions.gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name),
            now(), now(), '', '', '', ''
        );

        insert into auth.identities (
            id, user_id, provider_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) values (
            gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now()
        );
    end loop;
end $$;

-- Roles: el trigger sync_sales_role deja a Andrea como manager (primer usuario,
-- administrator = true); el resto nace executive y Pablo pasa a lector.
update public.sales set role = 'reader' where email = 'pablo.herrera@tekfusion-demo.cl';
update public.sales set whatsapp_phone = p.phone, signature = p.signature
from (values
    ('andrea.soto@tekfusion-demo.cl',   '+56911110001', '— Andrea Soto, TekFusion'),
    ('camila.rojas@tekfusion-demo.cl',  '+56911110002', '— Camila Rojas, TekFusion'),
    ('diego.munoz@tekfusion-demo.cl',   '+56911110003', '— Diego Muñoz, TekFusion'),
    ('pablo.herrera@tekfusion-demo.cl', '+56911110004', '— Pablo Herrera, TekFusion')
) as p(email, phone, signature)
where public.sales.email = p.email;

-- ---------------------------------------------------------------------
-- Líneas de negocio (3) y motivos de pérdida. Palabras clave = lineas.ts.
-- ---------------------------------------------------------------------
insert into public.business_lines (code, name, owner_sales_id, substitute_sales_id, keywords)
select l.code::public.business_line, l.name,
       (select id from public.sales where email = l.owner),
       (select id from public.sales where email = l.substitute),
       l.keywords
from (values
    ('valvulas',  'Válvulas',                  'camila.rojas@tekfusion-demo.cl', 'diego.munoz@tekfusion-demo.cl',  array['valvula','compuerta','bola','mariposa','check','globo','actuador']),
    ('tuberias',  'Tuberías',                  'diego.munoz@tekfusion-demo.cl',  'camila.rojas@tekfusion-demo.cl', array['tuberia','caneria','hdpe','pvc','acero','ppr','fitting','codo','union','flange','manguera']),
    ('geoceldas', 'Geoceldas y geosintéticos', 'camila.rojas@tekfusion-demo.cl', 'diego.munoz@tekfusion-demo.cl', array['geocelda','geosintetico','geomembrana','geotextil','geomalla','contencion','estabiliz'])
) as l(code, name, owner, substitute, keywords);

insert into public.lost_reasons (name, position) values
    ('Precio', 1), ('Competencia', 2), ('Sin respuesta', 3), ('Sin presupuesto', 4), ('Otro', 5);

-- ---------------------------------------------------------------------
-- Empresas (12): minería, construcción, agua y agro. Todas inventadas.
-- ---------------------------------------------------------------------
insert into public.companies (name, sector, size, website, phone_number, address, city, state_abbr, country, description, tax_identifier, sales_id, created_at)
select c.name, c.sector, c.size, c.website, c.phone, c.address, c.city, c.region, 'Chile', c.description, c.rut,
       (select id from public.sales where email = c.owner), now() - (c.days_ago || ' days')::interval
from (values
    ('Minera Cerro Cobrizo SpA',        'Minería',      250, 'cerrocobrizo.example',    '+56 55 2000 0101', 'Camino Interior 1200',     'Antofagasta',  'AN', 'Faena ficticia de cobre; recambio de válvulas en planta de flotación.', '76.000.001-1', 'camila.rojas@tekfusion-demo.cl', 88),
    ('Compañía Minera Quebrada Ocre',   'Minería',      500, 'quebradaocre.example',    '+56 52 2000 0102', 'Ruta C-17 km 40',          'Copiapó',      'AT', 'Minera inventada; relaves y conducción de agua en HDPE.',             '76.000.002-K', 'diego.munoz@tekfusion-demo.cl',  85),
    ('Sulfuros del Desierto Ltda.',     'Minería',       50, 'sulfurosdesierto.example','+56 57 2000 0103', 'Av. Ficticia 455',         'Iquique',      'TA', 'Contratista minero de ejemplo.',                                     '76.000.003-8', 'camila.rojas@tekfusion-demo.cl', 80),
    ('Constructora Los Arrayanes SpA',  'Construcción', 120, 'losarrayanes.example',    '+56 2 2000 0104',  'Calle Inventada 890',      'Santiago',     'RM', 'Constructora de ejemplo; obras viales con geoceldas.',               '76.000.004-6', 'diego.munoz@tekfusion-demo.cl',  78),
    ('Ingeniería y Obras Patagua Ltda.','Construcción',  45, 'patagua-obras.example',   '+56 41 2000 0105', 'Pasaje Demo 12',           'Concepción',   'BI', 'Empresa ficticia de obras civiles y taludes.',                       '76.000.005-4', 'camila.rojas@tekfusion-demo.cl', 70),
    ('Edificaciones Cordillera Sur SpA','Construcción',  90, 'cordillerasur.example',   '+56 65 2000 0106', 'Av. Imaginaria 3300',      'Puerto Montt', 'LL', 'Constructora inventada del sur.',                                    '76.000.006-2', 'diego.munoz@tekfusion-demo.cl',  65),
    ('Aguas del Valle Escondido S.A.',  'Agua',         300, 'valleescondido.example',  '+56 51 2000 0107', 'Camino Sanitario 77',      'La Serena',    'CO', 'Sanitaria ficticia; redes de agua potable en HDPE.',                 '76.000.007-0', 'camila.rojas@tekfusion-demo.cl', 60),
    ('Cooperativa de Agua Rural Laurel','Agua',          15, 'apr-laurel.example',      '+56 72 2000 0108', 'Sector Rural s/n',         'Rancagua',     'LI', 'APR de ejemplo; ampliación de matriz y válvulas de corte.',          '76.000.008-9', 'diego.munoz@tekfusion-demo.cl',  55),
    ('Hidrosur Tratamientos SpA',       'Agua',          60, 'hidrosur-trat.example',   '+56 63 2000 0109', 'Parque Industrial Demo 5', 'Valdivia',     'LR', 'Planta inventada de tratamiento de aguas.',                          '76.000.009-7', 'camila.rojas@tekfusion-demo.cl', 45),
    ('Agrícola Nogal Dorado Ltda.',     'Agro',          80, 'nogaldorado.example',     '+56 75 2000 0110', 'Fundo Ficticio km 8',      'Curicó',       'ML', 'Agrícola de ejemplo; riego tecnificado y tranques.',                 '76.000.010-0', 'diego.munoz@tekfusion-demo.cl',  40),
    ('Viñedos Altos de Quillay SpA',    'Agro',          35, 'altosquillay.example',    '+56 72 2000 0111', 'Camino Viñas 220',         'San Fernando', 'LI', 'Viña inventada; conducción de riego.',                               '76.000.011-9', 'camila.rojas@tekfusion-demo.cl', 30),
    ('Frutícola Las Pataguas SpA',      'Agro',         150, 'fruticolapataguas.example','+56 73 2000 0112','Ruta 5 Sur km 300 (ficticio)','Linares',   'ML', 'Exportadora de fruta ficticia.',                                     '76.000.012-7', 'diego.munoz@tekfusion-demo.cl',  20)
) as c(name, sector, size, website, phone, address, city, region, description, rut, owner, days_ago);

-- ---------------------------------------------------------------------
-- Contactos (20). El trigger 20_contact_saved consulta Gravatar por HTTP;
-- se desactiva durante la carga para que el seed no dependa de internet
-- ni envíe nada a servicios externos.
-- ---------------------------------------------------------------------
alter table public.contacts disable trigger "20_contact_saved";

with company_ids as (
    select array_agg(id order by id) as ids from public.companies
)
insert into public.contacts (first_name, last_name, gender, title, background, first_seen, last_seen, has_newsletter, status, company_id, sales_id, email_jsonb, phone_jsonb)
select p.first_name, p.last_name, p.gender, p.title, 'Contacto ficticio para pruebas.',
       now() - (p.days_ago || ' days')::interval,
       now() - ((p.days_ago / 3) || ' days')::interval,
       false, 'warm',
       ci.ids[p.company_idx],
       (select sales_id from public.companies where id = ci.ids[p.company_idx]),
       jsonb_build_array(jsonb_build_object('email', p.email, 'type', 'Work')),
       jsonb_build_array(jsonb_build_object('number', p.phone, 'type', 'Work'))
from company_ids ci,
(values
    ('Rodrigo',   'Valdés Ibarra',    'male',   'Jefe de Mantención',        1,  'rvaldes@cerrocobrizo.example',      '+56 9 0000 0001', 87),
    ('Francisca', 'Leiva Contreras',  'female', 'Encargada de Compras',      1,  'fleiva@cerrocobrizo.example',       '+56 9 0000 0002', 84),
    ('Matías',    'Fuentealba Ríos',  'male',   'Superintendente de Planta', 2,  'mfuentealba@quebradaocre.example',  '+56 9 0000 0003', 83),
    ('Javiera',   'Orellana Paz',     'female', 'Ingeniera de Proyectos',    2,  'jorellana@quebradaocre.example',    '+56 9 0000 0004', 79),
    ('Cristóbal', 'Saavedra Pino',    'male',   'Administrador de Contrato', 3,  'csaavedra@sulfurosdesierto.example','+56 9 0000 0005', 77),
    ('Valentina', 'Godoy Marín',      'female', 'Jefa de Obra',              4,  'vgodoy@losarrayanes.example',       '+56 9 0000 0006', 75),
    ('Sebastián', 'Carrasco Vidal',   'male',   'Gerente de Proyectos',      4,  'scarrasco@losarrayanes.example',    '+56 9 0000 0007', 72),
    ('Constanza', 'Riquelme Soto',    'female', 'Ingeniera Civil',           5,  'criquelme@patagua-obras.example',   '+56 9 0000 0008', 68),
    ('Felipe',    'Navarrete Lagos',  'male',   'Encargado de Adquisiciones',6,  'fnavarrete@cordillerasur.example',  '+56 9 0000 0009', 64),
    ('Catalina',  'Bustos Henríquez', 'female', 'Jefa de Redes',             7,  'cbustos@valleescondido.example',    '+56 9 0000 0010', 59),
    ('Ignacio',   'Tapia Mardones',   'male',   'Ingeniero de Operaciones',  7,  'itapia@valleescondido.example',     '+56 9 0000 0011', 57),
    ('Daniela',   'Sepúlveda Araya',  'female', 'Presidenta APR',            8,  'dsepulveda@apr-laurel.example',     '+56 9 0000 0012', 54),
    ('Tomás',     'Vergara Quiroz',   'male',   'Jefe de Planta',            9,  'tvergara@hidrosur-trat.example',    '+56 9 0000 0013', 44),
    ('Isidora',   'Cáceres Molina',   'female', 'Encargada de Compras',      9,  'icaceres@hidrosur-trat.example',    '+56 9 0000 0014', 42),
    ('Benjamín',  'Alarcón Toro',     'male',   'Administrador de Campo',    10, 'balarcon@nogaldorado.example',      '+56 9 0000 0015', 39),
    ('Antonia',   'Figueroa Lillo',   'female', 'Jefa de Riego',             10, 'afigueroa@nogaldorado.example',     '+56 9 0000 0016', 36),
    ('Vicente',   'Espinoza Cid',     'male',   'Enólogo y Jefe de Campo',   11, 'vespinoza@altosquillay.example',    '+56 9 0000 0017', 29),
    ('Martina',   'Pizarro Olave',    'female', 'Gerenta de Operaciones',    12, 'mpizarro@fruticolapataguas.example','+56 9 0000 0018', 19),
    ('Joaquín',   'Reyes Arriagada',  'male',   'Encargado de Mantención',   12, 'jreyes@fruticolapataguas.example',  '+56 9 0000 0019', 15),
    ('Florencia', 'Muñoz Bravo',      'female', 'Ingeniera Agrónoma',        11, 'fmunoz@altosquillay.example',       '+56 9 0000 0020', 10)
) as p(first_name, last_name, gender, title, company_idx, email, phone, days_ago);

alter table public.contacts enable trigger "20_contact_saved";

-- ---------------------------------------------------------------------
-- Leads (60 deals): 10 por etapa (estados.ts: nuevo, contactado, cotizado,
-- ganado, perdido, archivado), creados en los últimos 90 días, montos CLP
-- enteros, asignados a los dos ejecutivos.
-- ---------------------------------------------------------------------
with
company_ids as (
    select array_agg(id order by id) as ids from public.companies
),
executives as (
    select array_agg(id order by id) as ids from public.sales
    where email in ('camila.rojas@tekfusion-demo.cl', 'diego.munoz@tekfusion-demo.cl')
),
stages as (
    select array['nuevo', 'contactado', 'cotizado', 'ganado', 'perdido', 'archivado'] as s
),
products as (
    select
        array[
            'Válvulas mariposa DN200 para planta',
            'Tubería HDPE PE100 SDR11 de 250 mm',
            'Geoceldas para estabilización de talud',
            'Válvulas de compuerta DN150 para red',
            'Tubería HDPE PE100 SDR17 de 400 mm',
            'Geoceldas para camino de acceso',
            'Válvulas de bola 2'''' inox',
            'Tubería HDPE para conducción de relaves',
            'Geoceldas para revestimiento de canal',
            'Válvulas de retención para impulsión'
        ] as names,
        array[
            'Cliente solicita cotización de válvulas mariposa con actuador neumático para recambio en planta.',
            'Requiere tuberías HDPE PE100 SDR11 en tiras de 12 m, con fittings electrofusión.',
            'Consulta por geoceldas de 150 mm de alto para estabilizar talud de 6 m, incluye geotextil.',
            'Ampliación de red: válvulas de compuerta con cuña elástica y cámaras.',
            'Matriz de tuberías HDPE PE100 SDR17 de 400 mm, unión por termofusión.',
            'Geoceldas para confinamiento de base granular en camino de acceso a faena.',
            'Reposición de válvulas de bola inoxidable 316 para línea de reactivos.',
            'Línea de tuberías HDPE para relaves, con pedido de espesores y presión nominal.',
            'Revestimiento de canal de regadío con geoceldas rellenas de hormigón.',
            'Válvulas de retención tipo wafer para sistema de impulsión de agua.'
        ] as descriptions
)
insert into public.deals (name, company_id, contact_ids, stage, description, amount, created_at, updated_at, archived_at, expected_closing_date, sales_id, index)
select
    pr.names[(g.i - 1) % 10 + 1],
    co.id,
    (select array_agg(ct.id order by ct.id) from public.contacts ct where ct.company_id = co.id),
    st.s[(g.i - 1) % 6 + 1],
    pr.descriptions[(g.i - 1) % 10 + 1],
    -- entre ~$800.000 y ~$48.000.000 CLP, redondeado a miles
    (800 + (g.i * 7919) % 47200) * 1000,
    created.at,
    least(created.at + ((g.i % 10) || ' days')::interval, now()),
    case when st.s[(g.i - 1) % 6 + 1] = 'archivado'
         then created.at + ((10 + g.i % 20) || ' days')::interval end,
    (created.at + ((30 + g.i % 30) || ' days')::interval)::date,
    -- alterna el ejecutivo por bloques de 6 para que cada uno tenga leads en todas las etapas
    ex.ids[((g.i - 1) / 6) % 2 + 1],
    ((g.i - 1) / 6)::smallint
from generate_series(1, 60) as g(i)
cross join company_ids ci
cross join executives ex
cross join stages st
cross join products pr
cross join lateral (
    select id, name from public.companies where id = ci.ids[(g.i * 5) % 12 + 1]
) as co
cross join lateral (
    -- 1 a 89 días atrás; los archivados quedan entre 31 y 89 días para que
    -- archived_at no caiga en el futuro
    select now() - (case when (g.i - 1) % 6 = 5
                         then 31 + (g.i * 13) % 59
                         else 1 + (g.i * 37) % 89 end || ' days')::interval as at
) as created;

-- Columnas de la Fase 2 en los leads: línea por el producto, canal de origen
-- rotado, confianza de la IA cuando el canal es automático, monto final en los
-- ganados y motivo en los perdidos.
update public.deals set
    business_line = case
        when name ilike 'válvula%' then 'valvulas'
        when name ilike 'tubería%' then 'tuberias'
        when name ilike 'geocelda%' then 'geoceldas'
        else 'indeterminada' end::public.business_line,
    origin_channel = (array['correo','formulario','whatsapp','manual','bot'])[(id % 5) + 1]::public.origin_channel,
    ai_confidence = case when (id % 5) + 1 = 4 then null else 0.70 + ((id * 7) % 30) / 100.0 end,
    won_amount = case when stage = 'ganado' then amount end,
    lost_reason_id = case when stage = 'perdido'
        then (select id from public.lost_reasons order by position offset (public.deals.id % 5) limit 1) end,
    first_response_at = case when stage <> 'nuevo' then created_at + interval '3 hours' end,
    last_activity_at = updated_at;

-- Tres leads nuevos sin asignar: la cola que los ejecutivos pueden tomar (take_deal).
update public.deals set sales_id = null
where id in (select id from public.deals where stage = 'nuevo' order by id limit 3);

-- ---------------------------------------------------------------------
-- Contactos calientes (5): 3 de Camila y 2 de Diego. El dashboard filtra
-- por el ejecutivo conectado, así que ambos ven la tarjeta con datos.
-- El trigger de Gravatar se apaga igual que en la carga de contactos.
-- ---------------------------------------------------------------------
alter table public.contacts disable trigger "20_contact_saved";

with owners as (
    select id, case email when 'camila.rojas@tekfusion-demo.cl' then 3 else 2 end as n
    from public.sales
    where email in ('camila.rojas@tekfusion-demo.cl', 'diego.munoz@tekfusion-demo.cl')
),
ranked as (
    select c.id, row_number() over (partition by c.sales_id order by c.id) as rn, o.n
    from public.contacts c join owners o on o.id = c.sales_id
)
update public.contacts set status = 'hot'
where id in (select id from ranked where rn <= n);

alter table public.contacts enable trigger "20_contact_saved";

-- ---------------------------------------------------------------------
-- Tareas pendientes (8): 4 de Camila y 4 de Diego, sobre sus propios
-- contactos, con vencimientos repartidos (atrasada, hoy, mañana, semana,
-- más adelante) para que se vean todos los grupos de la lista.
-- ---------------------------------------------------------------------
with exec_contacts as (
    select s.email, c.id as contact_id, c.sales_id,
           row_number() over (partition by c.sales_id order by c.id) as rn
    from public.contacts c join public.sales s on s.id = c.sales_id
    where s.email in ('camila.rojas@tekfusion-demo.cl', 'diego.munoz@tekfusion-demo.cl')
)
insert into public.tasks (contact_id, type, text, due_date, sales_id)
select ec.contact_id, t.type, t.text, now() + (t.days || ' days')::interval, ec.sales_id
from (values
    ('camila.rojas@tekfusion-demo.cl', 1, 'call',      'Llamar para confirmar medidas de las válvulas mariposa', -2),
    ('camila.rojas@tekfusion-demo.cl', 2, 'email',     'Enviar ficha técnica de tubería HDPE PE100 SDR11', 0),
    ('camila.rojas@tekfusion-demo.cl', 3, 'follow-up', 'Seguimiento de la cotización de geoceldas', 1),
    ('camila.rojas@tekfusion-demo.cl', 4, 'meeting',   'Reunión en faena para revisar el talud', 4),
    ('diego.munoz@tekfusion-demo.cl',  1, 'follow-up', 'Seguimiento de cotización de válvulas de compuerta', -1),
    ('diego.munoz@tekfusion-demo.cl',  2, 'call',      'Confirmar plazo de despacho de la matriz HDPE', 0),
    ('diego.munoz@tekfusion-demo.cl',  3, 'email',     'Enviar certificado de calidad de las geoceldas', 3),
    ('diego.munoz@tekfusion-demo.cl',  4, 'demo',      'Mostrar muestras de geomembrana en oficina', 12)
) as t(email, rn, type, text, days)
join exec_contacts ec on ec.email = t.email and ec.rn = t.rn;

-- ---------------------------------------------------------------------
-- Notas en leads (10), a nombre del ejecutivo del lead.
-- ---------------------------------------------------------------------
insert into public.deal_notes (deal_id, text, date, sales_id)
select d.id, n.text, now() - (n.days || ' days')::interval, d.sales_id
from (values
    (1,  'Cliente pide reemplazar 12 válvulas antes de la parada de planta de diciembre.', 1),
    (2,  'Se envió catálogo HDPE; esperan aprobación de ingeniería.', 2),
    (3,  'Visitamos el talud: 6 m de altura, suelo arcilloso. Recomendar geocelda de 150 mm.', 3),
    (4,  'Piden precio con y sin cámara de válvulas.', 4),
    (5,  'Cotización enviada; competencia ofrece 8 % menos.', 5),
    (6,  'Camino de acceso de 1,2 km; consultan plazo de entrega a Calama.', 6),
    (7,  'Necesitan certificado de acero inoxidable 316.', 7),
    (8,  'Ingeniero de proyecto pidió presión nominal PN16.', 8),
    (9,  'Canal de regadío: confirmar si el relleno es hormigón o grava.', 9),
    (10, 'Cliente dejó de responder; segundo seguimiento enviado.', 10)
) as n(deal_rank, text, days)
join (select id, sales_id, row_number() over (order by id) as deal_rank from public.deals) d
  on d.deal_rank = n.deal_rank;

-- ---------------------------------------------------------------------
-- Fase 3: plantillas (4), respuestas rápidas (4), cotizaciones (15),
-- seguimientos (20) y alertas (10). Todo ficticio.
-- ---------------------------------------------------------------------
insert into public.templates (name, channel, subject, body) values
    ('Seguimiento 1 · correo', 'correo', 'Cotización {{producto}} · TekFusion',
     'Hola {{nombre}}, le escribo para saber si pudo revisar la cotización de {{producto}} para {{empresa}}. Quedo atento a sus comentarios. {{ejecutivo}}'),
    ('Seguimiento 2 · correo', 'correo', 'Seguimos atentos · {{producto}}',
     'Hola {{nombre}}, ¿hay algo de la cotización que podamos ajustar (plazo, cantidades, alternativa)? {{ejecutivo}}'),
    ('Seguimiento 1 · WhatsApp', 'whatsapp', null,
     'Hola {{nombre}}, ¿alcanzó a revisar la cotización de {{producto}}? Cualquier duda me escribe por aquí. {{ejecutivo}}'),
    ('Último seguimiento · WhatsApp', 'whatsapp', null,
     'Hola {{nombre}}, cierro el seguimiento de la cotización de {{producto}}. Si más adelante la necesitan, la actualizamos. {{ejecutivo}}');

insert into public.quick_replies (title, body) values
    ('Saludo', 'Hola, gracias por escribir a TekFusion. ¿En qué le podemos ayudar?'),
    ('Pedir datos', '¿Nos puede indicar diámetro, presión de trabajo y cantidad aproximada?'),
    ('Cotización en camino', 'Estamos preparando la cotización; se la enviamos hoy durante el día.'),
    ('Fuera de horario', 'Gracias por su mensaje. Nuestro horario es de lunes a viernes de 9:00 a 18:00; le respondemos a primera hora.');

-- Cotizaciones: v1 en los 10 leads cotizados; los 5 primeros tienen además
-- una v2 vigente (la v1 queda como historial). Rutas con nombre regenerado.
insert into public.quotes (deal_id, version, amount, pdf_path, is_current, sent_at, sent_channels, delivery_status, sales_id, created_at)
select d.id, 1, d.amount,
       format('deals/%s/%s.pdf', d.id, gen_random_uuid()),
       d.rank > 5,
       d.updated_at,
       case d.rank % 3 when 0 then array['correo'] when 1 then array['whatsapp'] else array['correo', 'whatsapp'] end::public.send_channel[],
       (array['enviado', 'entregado', 'leido'])[d.rank % 3 + 1]::public.delivery_status,
       d.sales_id, d.updated_at - interval '1 hour'
from (select id, amount, sales_id, updated_at, row_number() over (order by id) as rank
        from public.deals where stage = 'cotizado') d;

insert into public.quotes (deal_id, version, amount, pdf_path, is_current, sent_at, sent_channels, delivery_status, sales_id, created_at)
select q.deal_id, 2, (q.amount * 0.95)::bigint / 1000 * 1000,
       format('deals/%s/%s.pdf', q.deal_id, gen_random_uuid()),
       true,
       case when q.rank = 5 then null else least(q.sent_at + interval '2 days', now()) end,
       case when q.rank = 5 then '{}' else array['correo'] end::public.send_channel[],
       case when q.rank = 5 then 'pendiente' when q.rank = 4 then 'fallido' else 'entregado' end::public.delivery_status,
       q.sales_id, least(q.sent_at + interval '2 days', now()) - interval '1 hour'
from (select *, row_number() over (order by deal_id) as rank from public.quotes where not is_current) q;

-- Seguimientos: dos pasos por lead cotizado. Paso 1 ya enviado (o cancelado
-- porque el cliente respondió); paso 2 pendiente, vencido o recordatorio.
insert into public.followups (deal_id, step, scheduled_at, channels, mode, template_id, status, sent_at, job_id, attempts, cancel_reason)
select d.id, 1, d.updated_at + interval '2 days',
       array['correo']::public.send_channel[], 'automatico',
       (select id from public.templates where name = 'Seguimiento 1 · correo'),
       case when d.rank % 4 = 0 then 'cancelado' else 'enviado' end::public.followup_status,
       case when d.rank % 4 = 0 then null else d.updated_at + interval '2 days' end,
       case when d.rank % 4 = 0 then null else format('seed-%s-1', d.id) end,
       case when d.rank % 4 = 0 then 0 else 1 end,
       case when d.rank % 4 = 0 then 'El cliente respondió por WhatsApp' end
from (select id, updated_at, row_number() over (order by id) as rank
        from public.deals where stage = 'cotizado') d;

insert into public.followups (deal_id, step, scheduled_at, channels, mode, template_id, status, cancel_reason)
select d.id, 2,
       case when d.rank % 3 = 0 then now() - interval '1 day' else now() + (d.rank || ' days')::interval end,
       case when d.rank % 2 = 0 then array['whatsapp'] else array['correo', 'whatsapp'] end::public.send_channel[],
       case when d.rank % 3 = 0 then 'recordatorio' else 'automatico' end::public.followup_mode,
       (select id from public.templates where name = 'Seguimiento 1 · WhatsApp'),
       case when d.rank % 4 = 0 then 'cancelado' when d.rank % 3 = 0 then 'vencido' else 'pendiente' end::public.followup_status,
       case when d.rank % 4 = 0 then 'El cliente respondió por WhatsApp' end
from (select id, row_number() over (order by id) as rank
        from public.deals where stage = 'cotizado') d;

-- Alertas: a los ejecutivos por sus leads y a gerencia; 3 ya leídas.
insert into public.alerts (type, recipient_sales_id, deal_id, message, read_at, created_at)
select a.type::public.alert_type, s.id, d.id, a.message,
       case when a.is_read then now() - interval '2 hours' end,
       now() - (a.hours || ' hours')::interval
from (values
    ('sin_contacto_24h',      'camila.rojas@tekfusion-demo.cl', 'nuevo',      0, 'Lead sin contacto hace más de 24 h',              false, 3),
    ('sin_contacto_24h',      'diego.munoz@tekfusion-demo.cl',  'nuevo',      0, 'Lead sin contacto hace más de 24 h',              false, 5),
    ('sin_contacto_24h',      'andrea.soto@tekfusion-demo.cl',  'nuevo',      1, 'Lead sin contacto hace más de 24 h',              false, 5),
    ('seguimiento_vencido',   'camila.rojas@tekfusion-demo.cl', 'cotizado',   0, 'Recordatorio de seguimiento vencido',             false, 20),
    ('seguimiento_vencido',   'diego.munoz@tekfusion-demo.cl',  'cotizado',   0, 'Recordatorio de seguimiento vencido',             true,  30),
    ('cliente_respondio',     'camila.rojas@tekfusion-demo.cl', 'cotizado',   1, 'El cliente respondió por WhatsApp',               false, 1),
    ('cliente_respondio',     'diego.munoz@tekfusion-demo.cl',  'contactado', 0, 'El cliente respondió por correo',                 true,  48),
    ('por_archivar',          'andrea.soto@tekfusion-demo.cl',  'nuevo',      2, 'Lead con 14 días en nuevo: se archivará en 48 h', false, 12),
    ('sin_asignar',           'andrea.soto@tekfusion-demo.cl',  'nuevo',      0, 'Lead sin asignar',                                false, 2),
    ('whatsapp_desconectado', 'andrea.soto@tekfusion-demo.cl',  null,         0, 'El número de WhatsApp se desconectó',             true,  72)
) as a(type, email, stage, nth, message, is_read, hours)
join public.sales s on s.email = a.email
-- El n-ésimo lead de la etapa: del propio ejecutivo; para gerencia, de
-- cualquiera (sin_asignar: uno sin dueño). whatsapp_desconectado: sin lead.
left join lateral (
    select x.id from public.deals x
    where x.stage = a.stage
      and case when a.type = 'sin_asignar' then x.sales_id is null
               when s.role = 'manager' then x.sales_id is not null
               else x.sales_id = s.id end
    order by x.id offset a.nth limit 1
) d on true;
