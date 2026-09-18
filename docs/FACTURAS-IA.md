# Lectura de facturas con Gemini

La aplicación ya comprime la fotografía en el navegador antes de enviarla a `/api/scan-invoice` (JPEG, ancho máximo de 800 px y calidad 0.7). El endpoint nuevo mantiene la clave de Gemini únicamente en el servidor.

## Configuración en Vercel

Configura estas variables en **Project Settings → Environment Variables** para Preview y Production:

- `GEMINI_API_KEY`: clave privada de Google AI Studio.
- `GEMINI_MODEL`: opcional; por defecto `gemini-2.5-flash`.
- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: clave publicable de Supabase, solo para validar el token de sesión.
- `APP_ORIGIN`: opcional; dominio de la aplicación para CORS.

Después de guardarlas, crea un nuevo deployment. No almacenes `GEMINI_API_KEY` en `localStorage`, en `js/` ni en variables `NEXT_PUBLIC_*`/equivalentes: cualquier secreto enviado al navegador puede ser extraído.

El endpoint exige una sesión válida de Supabase, acepta solo JPEG/PNG/WebP, limita el payload y tiene un tiempo máximo de 25 segundos. La compresión reduce el tiempo de subida, pero el tiempo total también depende de la red, la carga de Gemini y el tamaño de la imagen.
