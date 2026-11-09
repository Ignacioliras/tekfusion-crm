# Infraestructura (VPS)

**`infra/vps/`** tiene lo que se copia al VPS en `/opt/tekfusion` (paso a paso en
[`infra/vps/README.md`](vps/README.md)):
- `docker-compose.yml`: Evolution API (+ su Postgres y Redis), n8n (+ Postgres), Uptime Kuma, Caddy. **Ningún servicio con `ports:` públicos salvo Caddy (80/443).** Imágenes fijadas a versión, redes internas, volúmenes con nombre y healthchecks.
- `Caddyfile`: `evolution.<env>.tekfusion.cl`, `n8n.<env>.tekfusion.cl`, `status.<env>.tekfusion.cl` con HTTPS automático (`<env>` = `ENV_NAME` del `.env`).
- `.env.example`: todas las variables, con valores de relleno.

Falta (Fase 1):
- `hardening.sh`: `ufw` (22/80/443), SSH sin root y sin contraseña, `fail2ban`, `unattended-upgrades`.
- `backup.sh` + cron: `rclone` diario de volúmenes (n8n DB, Evolution sesión, Caddy, Uptime Kuma) a Cloudflare R2 `tekfusion-backups/vps/`; retención 30 días.
- `restore.md`: pasos de restauración probados en la Fase 5, con tiempos medidos.

Reglas en `docs/08-seguridad-roles.md` (sección Servidor y Respaldos). Nada de este directorio contiene secretos: van en `.env` del VPS (fuera del repo) y en la bóveda.
