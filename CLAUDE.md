# Web_Lab (TestLab 101)

Plataforma de practica de QA: 12 apps web con **mas de 290 bugs inyectados a
proposito** (niveles 1 a 10), cada una con un QA Inspector y un Bug Reporter.
Vite + React + TypeScript, mas backends en `api-lab/`. Se sirve como subruta de
tojoin: **tojoin.org/Lab101**. La documentacion esta en ingles. Mantenla asi.

## Comandos

```bash
npm install && npm run dev      # http://localhost:5173, no necesita .env
npm run lint && npm run test:unit
npm run build                   # tsc -b + vite build + scripts/nest-lab101.mjs
npm run test:e2e                # Playwright
npm run format:check            # solo los archivos que tu cambio toca
```

## Lo que no es obvio

- **Los bugs de `src/apps/**` y `api-lab/services/**` son el material
  didactico, no deuda. No los arregles** salvo que se pida. Estan catalogados en
  `src/data/knownBugs.ts` (`TOTAL_BUGS` es el conteo autoritativo) y en el
  `KNOWN_BUGS.md` de cada servicio.
- **Los tests de caracterizacion afirman que el bug existe.** Pasan mientras el
  bug siga ahi y fallan si lo arreglas: es la senal buscada. Si arreglas un bug
  a proposito, actualiza el registro y el test juntos.
- **`VITE_BASE` define dos builds.** Por defecto `/Lab101/` (Vercel detras de
  tojoin.org); `nest-lab101.mjs` mueve `dist/` a `dist/Lab101/`. La imagen Docker
  construye con `VITE_BASE=/` y sirve en la raiz: ahi el script no anida.
- **El banco de respuestas es privado** (repo `Web_Lab-answers`), leido por
  `api/solutions.ts` con `ANSWERS_TOKEN` de solo lectura y protegido con
  `SOLUTIONS_KEY`. El valor por defecto de `SOLUTIONS_KEY` es `REVEAL`: en
  produccion debe ser otro. Nunca pongas el contenido de las respuestas en este
  repo ni en un issue.
- Hay un workflow de Docker por cada servicio (`.github/workflows/docker-*.yml`);
  un cambio de servicio puede disparar uno.

## Estado

`TECH_DEBT.md`: diez de los doce backends sin tests de comportamiento,
45 ramas remotas y 20 locales obsoletas, imagenes con devDependencies,
BUG-DB-05 sin cobertura en CI, formato Prettier pendiente en 210 de 362
archivos. Leelo antes de proponer trabajo nuevo.

## Commits y cierre

- Mensajes en espanol, imperativo, con el **por que** en el cuerpo. Sin
  `Co-Authored-By`.
- Nunca hagas push sin confirmarlo con el usuario.
