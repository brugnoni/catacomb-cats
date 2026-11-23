# Validación de traslado — 2026-11-23

Se volvió a ejecutar `npm exec --yes --package=pnpm@11.25.0 -- pnpm check` al preparar este paquete:

- Formato Prettier: correcto.
- ESLint: correcto.
- TypeScript: correcto.
- Pruebas del motor, progresión y simulaciones: 71 correctas.
- Build de producción: correcta, con assets, fuentes y avisos de licencia locales.
- Pruebas Chromium de la aplicación compilada: 21 correctas.

Entorno de esta validación: macOS, Node v26.0.0 y npm 11.12.1. El proyecto y CI apuntan a Node 24 LTS. Esta comprobación no sustituye ejecutar los controles en el sistema operativo de destino.

## Contenido y autonomía

Todos los assets usados por la aplicación están dentro del proyecto; el borrador inicial del atlas se conservó en assets/source. Las dos skills son archivos locales bajo .agents/skills. Se incluyeron las licencias de fuentes, React, React DOM y Scheduler. No se requieren servicios ni claves para ejecutar el juego.

El paquete incluye la build dist, archivos ocultos, código y documentación. node_modules, cachés, resultados temporales de tests y metadatos Git no se trasladan; las dependencias se reinstalan con el lockfile. El repositorio original no tenía commits ni remotos al empaquetar.

El empaquetador produce un manifiesto SHA-256 y un checksum del ZIP. La verificación de transferencia comprueba los archivos de esa instantánea y se repite sobre una extracción en otra ubicación. El manifiesto excluye su propio hash y los archivos del paquete que se generarían recursivamente.

El progreso real de tu navegador no está incluido. La guía docs/TRANSFERENCIA.md explica cómo copiar por separado el JSON del almacenamiento local.
