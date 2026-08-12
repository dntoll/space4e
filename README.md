# Space

A TypeScript/Vite strategy game where civilizations expand across planets,
manage an economy of ore, material and energy, and fight over territory.

## Run locally

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm test
npm run build
```

Click a planet to select it, then click a target planet to set its destination
(drag from the selected planet onto another planet). Drag with mouse or touch to
pan. The keyboard and the buttons at the bottom of the screen build things:

- `E` Extractor
- `R` Refinery
- `L` Collector
- `C` Colonizer factory
- `H` Fighter (Hunter) factory
- `B` Bomber factory

The panel at the top right pauses with `SPACE`, selects 1/10 speed (`>`) or
normal speed (`>>`). Pointer Events are used for both mouse and touch.

## Architecture

- `src/game/model/`: browser-independent geometry, world, ships, industries and
  economy. One class per file.
- `src/game/view/renderer.ts`: responsive Canvas rendering and camera.
- `src/game/view/input.ts`: keyboard, pointer and mobile buttons.
- `src/game/controller/controller.ts`: translates input into domain commands.
- `src/main.ts`: `requestAnimationFrame`, resize and lifecycle.

Vite uses `base: "./"` and produces `dist`.

## Game requirements

### Planets and resources

Planets are spread out across space. Each planet has:

- An **inventory** with four quantities:
  - **Unmined Ore** (finite, in the ground)
  - **Mined Ore** (ready for refining)
  - **Material** (used to construct things)
  - **Energy** (collected directly, powers ships)
- A **Collection Potential** that determines how quickly Energy can be collected.
- A number of **building spots** (3-5, randomly per planet) where the owner can
  construct buildings.
- A **destination**, controlled by the planet's owner. Destinations can form
  chains between planets.
- An **owner** (Player, Computer, or None).

Resources are collected to finance construction. Ore is converted into Material
through a Refinery. Energy is collected directly. Ships use Energy. Material is
used to construct things. Material and Energy can be moved between planets using
Transporters (Freight-ships).

A planet is **unbuilt** if it has no buildings.

### Buildings

- **Extractor** (takes a building spot): mines Ore. Ore is finite.
- **Collector** (takes a building spot): collects Energy. Energy is infinite.
- **Refinery** (takes a building spot): converts Ore into Material.
- **Spaceport** (does NOT take a building spot): created when a Colonizer lands
  on a planet. Every planet needs a Spaceport. A Spaceport also produces one
  Transporter at a time while the planet has a destination. Ships refill Energy
  while in Orbit around a planet that has a Spaceport (the Energy is taken from
  the planet's inventory).
- **Colonizer Factory** (takes a building spot): supports one Colonizer at a
  time. If its Colonizer is destroyed, the factory starts building a new one.
- **Bomber Factory** (takes a building spot): supports one Bomber. If the Bomber
  is destroyed, the factory starts building a new one.
- **Fighter Factory** (takes a building spot): supports one Fighter (Hunter).
  Same replacement behaviour.
- **Planetary Defense Gun** (takes a building spot): fires at ships in Orbit and
  prevents hostile Colonizers from landing.

Construction requires Material (deducted from the planet inventory when a
building is queued). A Spaceport is placed for free when a Colonizer lands.

### Ship Energy and Orbit

Ships refill their Energy while in Orbit around a planet that has a Spaceport.
The Energy is taken from the planet's inventory. If a ship does not have enough
Energy to travel to its destination, it does not leave and remains in Orbit. A
ship that runs out of Energy mid-travel returns to its last Spaceport planet to
refuel, then resumes its mission. Remaining in Orbit does not consume Energy.

### Transporters (Freight-ships)

A Transporter has three separate cargo holds: Ore, Material and Energy. At its
source planet it automatically fills each cargo hold with the corresponding
available resource. It then travels to the destination planet, unloads its
cargo there, and returns to its source planet (it does not transport resources
back). A Transporter also refuels its own Energy at both its source and
destination.

### Colonizers

When built, a Colonizer launches into Orbit and travels toward the destination
of its home planet, following chains of planet destinations. If a Colonizer
reaches an unbuilt planet, it lands and becomes a Spaceport. A hostile Planetary
Defense Gun prevents landing; if the guns are destroyed, the Colonizer can land.
Hostile factories do not prevent landing.

### Bombers

Bombers can destroy hostile factories from Orbit. A Bomber travels toward the
destination of its planet. If that destination planet also has a destination,
the Bomber can continue toward the next destination.

### Fighters (Hunters)

A Fighter can shoot down other ships, shoot Planetary Defense Guns, and travel
to other planets. Fighters follow chains of planet destinations.

### Player control

The player controls what is built and planet destinations. Ships control
themselves and try to fulfill their assignments based on the configured
destinations.

### Other civilizations

There are other civilizations (currently one Computer opponent) that operate
according to the same principles.

## Implementation status

| Requirement | Status |
|---|---|
| Planets spread out, owners, destinations, destination chains | Implemented |
| Planet inventory (unmined ore, mined ore, material, energy, collection potential) | Implemented |
| Random 3-5 building spots per planet | Implemented |
| Material required to construct buildings | Implemented |
| Extractor (mines ore, finite) | Implemented |
| Collector (collects energy, infinite) | Implemented |
| Refinery (ore -> material) | Implemented |
| Spaceport (free, no slot, created on Colonizer landing, gates refueling, builds Freight-ships) | Implemented |
| Ship Energy consumption while traveling | Implemented |
| Ship refuel while orbiting a planet with a Spaceport | Implemented |
| Ship stays in orbit if not enough energy to reach destination | Implemented |
| Ship returns to last Spaceport when out of energy, then resumes | Implemented |
| Transporter / Freight-ship (3 cargo holds, load -> travel -> unload -> return, refuel at both ends) | Implemented |
| Colonizer (follows destination chain, lands on unbuilt planet, becomes Spaceport) | Implemented |
| Bomber (destroys factories from orbit, follows destination chain) | Implemented |
| Fighter / Hunter (shoots ships, travels to other planets) | Implemented |
| Colonizer Factory / Bomber Factory / Fighter Factory (one ship, auto-rebuild) | Implemented |
| Player controls building and destinations | Implemented |
| Computer civilization (same rules, basic AI) | Implemented |
| Planetary Defense Gun (fires at orbiting ships, blocks hostile Colonizer landing) | Not implemented |
| Colonizer landing blocked only by Planetary Defense Guns (not by factories) | Not implemented (currently any hostile factory blocks landing) |
| Bombers/Fighters can shoot Planetary Defense Guns | Not implemented (no PDG yet) |
