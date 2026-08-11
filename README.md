# Space – TypeScript/Vite

Projektet är en beteendetrogen webbport av det tidigare Java/Swing-spelet. Spelkärnan ligger i `src/game/model.ts`, rendering sker med Canvas 2D och byggsystemet är npm/Vite.

## Köra lokalt

```bash
npm install
npm run dev
```

För verifiering:

```bash
npm run typecheck
npm test
npm run build
```

Klicka på en planet för att välja den och klicka sedan på en målplanet. Tangenterna `C`, `H` och `B`, eller knapparna längst ned på skärmen, bygger kolonisations-, jakt- respektive bombfartyg. Pointer Events används för mus och touch.

## Arkitektur

- `src/game/model.ts`: webbläsaroberoende geometri, värld, skepp, AI och industrier.
- `src/game/renderer.ts`: responsiv Canvas-rendering och kamera.
- `src/game/input.ts`: tangentbord, pointer och mobilknappar.
- `src/game/controller.ts`: översätter input till domänkommandon.
- `src/main.ts`: `requestAnimationFrame`, resize och livscykel.

Vite använder `base: "./"` och producerar `dist`, vilket gör appen kompatibel med en framtida Capacitor-konfiguration med `webDir: "dist"`. Native-livscykel, lagring och plugins bör senare kapslas bakom adapters i stället för att läggas i spelmodellen.
