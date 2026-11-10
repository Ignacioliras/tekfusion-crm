# VPS de TekFusion CRM: instalación paso a paso

Levanta en el VPS (Hostinger, 8 GB) Evolution API (con su Postgres y Redis), n8n
(con su Postgres), Uptime Kuma y Caddy. **Solo Caddy publica puertos (80/443)**; el
resto queda en redes internas de Docker. Reglas en `docs/08-seguridad-roles.md`
(Servidor y Respaldos) y `docs/07-whatsapp-evolution.md`.

Un VPS por ambiente: `ENV_NAME=staging` (número de prueba de Libux, datos ficticios)
y `ENV_NAME=prod` (número corporativo). Primero todo en staging.

| Servicio | URL | Contenedor |
|---|---|---|
| Evolution API | `https://evolution.<ENV_NAME>.tekfusion.cl` | `evolution` (+ `evolution-db`, `evolution-redis`) |
| n8n | `https://n8n.<ENV_NAME>.tekfusion.cl` | `n8n` (+ `n8n-db`) |
| Uptime Kuma | `https://status.<ENV_NAME>.tekfusion.cl` | `uptime-kuma` |

## 0. Antes de empezar

- VPS con Ubuntu, Docker Engine y el plugin `docker compose` instalados.
- Endurecimiento de `docs/08` hecho: SSH solo con llave y sin root, `ufw` con solo
  22, 80 y 443, `fail2ban`, `unattended-upgrades`.
- DNS (en la cuenta del dominio de TekFusion): tres registros `A` hacia la IP del
  VPS: `evolution.<ENV_NAME>`, `n8n.<ENV_NAME>` y `status.<ENV_NAME>` de
  `tekfusion.cl`. Sin esto Caddy no obtiene los certificados.
- Revisar que los tags de imagen de `docker-compose.yml` sigan siendo la versión
  estable que se probó en staging (nunca `latest`).

## 1. Copiar los archivos al VPS

Desde tu computador, en la carpeta del repo:

```bash
ssh usuario@IP_DEL_VPS "sudo mkdir -p /opt/tekfusion && sudo chown \$USER /opt/tekfusion"
scp infra/vps/docker-compose.yml infra/vps/Caddyfile infra/vps/.env.example usuario@IP_DEL_VPS:/opt/tekfusion/
```

## 2. Completar el `.env`

En el VPS:

```bash
cd /opt/tekfusion
cp .env.example .env
chmod 600 .env
openssl rand -hex 32   # una vez por cada clave
nano .env
```

- `ENV_NAME`: `staging` o `prod`.
- `ACME_EMAIL`: casilla de Libux para avisos de Let's Encrypt.
- `EVOLUTION_API_KEY`, `EVOLUTION_DB_PASSWORD`, `N8N_DB_PASSWORD`,
  `N8N_ENCRYPTION_KEY`: una clave nueva de `openssl rand -hex 32` cada una (solo
  hex: las contraseñas de las bases van dentro de una URL).
- `EVOLUTION_WEBHOOK_URL`: `https://<ref>.supabase.co/functions/v1/whatsapp-webhook`
  del proyecto de Supabase **de ese ambiente**.
- Guardar el `.env` completo en la bóveda (Bitwarden). **Sin `N8N_ENCRYPTION_KEY`
  los respaldos de n8n no sirven.**

## 3. Levantar

```bash
docker compose config --quiet    # sin salida = el .env está completo
docker compose up -d
docker compose ps                # esperar a que todos digan "healthy" (~3 min)
```

Si un servicio no queda `healthy`: `docker compose logs -f <servicio>`.

## 4. Verificar

1. Solo Caddy escucha hacia afuera: `sudo ss -tlnp` muestra 22, 80 y 443 y nada más
   (Docker se salta `ufw` para los puertos publicados; por eso ningún otro servicio
   tiene `ports:`).
2. `curl https://evolution.<ENV_NAME>.tekfusion.cl` responde un JSON de bienvenida
   de Evolution con certificado válido.
3. `https://evolution.<ENV_NAME>.tekfusion.cl/manager`: abre en staging; en prod
   responde 404.
4. `https://n8n.<ENV_NAME>.tekfusion.cl`: crear el usuario dueño (único, de Libux) y
   activar 2FA en *Settings → Personal*.
5. `https://status.<ENV_NAME>.tekfusion.cl`: crear el admin con clave larga y los
   monitores de `docs/08` (CRM, Supabase, Evolution, n8n, conexión del número), con
   avisos a Libux por WhatsApp/Telegram.

## 5. Crear la instancia de WhatsApp

```bash
KEY=<EVOLUTION_API_KEY del .env>
URL=https://evolution.<ENV_NAME>.tekfusion.cl
curl -X POST "$URL/instance/create" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"tekfusion-staging","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

En prod la instancia se llama `tekfusion-prod`. Escanear el QR desde el teléfono del
número (en staging también se puede desde `/manager`).

## 6. Webhook hacia la Edge Function

El receptor (`supabase/functions/whatsapp-webhook`) exige el header `apikey` igual
al secreto `EVOLUTION_WEBHOOK_SECRET` de Supabase, así que el webhook se configura
por instancia (el global no permite headers y queda apagado en el `.env`):

```bash
curl -X POST "$URL/webhook/set/tekfusion-staging" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"<EVOLUTION_WEBHOOK_URL>","headers":{"apikey":"<EVOLUTION_WEBHOOK_SECRET>"},"byEvents":false,"base64":false,
       "events":["MESSAGES_UPSERT","MESSAGES_UPDATE","CONNECTION_UPDATE","SEND_MESSAGE"]}}'
```

Probar con un mensaje al número: debe aparecer en la bandeja del CRM en menos de 3 s
(pruebas completas en `docs/07`, "Pruebas obligatorias").

## Actualizar (una vez al mes, primero staging)

```bash
cd /opt/tekfusion
# cambiar el tag en docker-compose.yml (copiado desde el repo, ya probado en staging)
docker compose pull
docker compose up -d
docker compose ps
```

## Emergencia: WhatsApp usado de forma extraña

`docker compose stop evolution` y avisar a gerencia (`docs/08`, Incidentes).

## Volúmenes (lo que respalda `backup.sh`, pendiente)

`evolution_instances`, `evolution_db`, `evolution_redis`, `n8n_data`, `n8n_db`,
`uptime_kuma`, `caddy_data`, `caddy_config`. Docker les antepone el nombre del
proyecto (`tekfusion_…`, por la carpeta `/opt/tekfusion`).
