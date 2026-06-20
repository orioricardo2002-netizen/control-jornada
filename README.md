# Jornada Laboral

App web estatica para control de jornada laboral.

## Despliegue en Vercel

1. Sube todos los archivos de esta carpeta a un repositorio de GitHub.
2. En Vercel, selecciona `Add New Project`.
3. Importa el repositorio.
4. En Framework Preset, elige `Other`.
5. Deja Build Command vacio.
6. Deja Output Directory vacio o como `.`.
7. Pulsa `Deploy`.

## Archivos necesarios

- `index.html`
- `app.js`
- `style.css`
- `manifest.webmanifest`
- `favicon-32.png`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`

## Supabase

La app usa la publishable key de Supabase en el frontend. La seguridad depende de tener Row Level Security activo en las tablas `jornadas` y `perfiles`.
