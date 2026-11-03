@echo off
rem Doble clic: lanza la sesion nocturna de hoy (docs\nocturno\<hoy>.json). Deja esta ventana abierta.
cd /d "%~dp0"
node scripts\tekfusion\nocturno.mjs %*
pause
