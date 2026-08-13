export const ViewStrings = {
  App: {
    ariaLabel: 'Space game',
    canvasMissing: 'Canvas missing',
  },

  TimeControls: {
    ariaLabel: 'Time controls',
    pause: 'Pause (SPACE)',
    slow: '>',
    normal: '>>',
  },

  BuildControls: {
    ariaLabel: 'Build controls',
  },

  ShortCodes: {
    extractor: 'E',
    collector: 'L',
    colonizer: 'C',
    hunter: 'H',
    bomber: 'B',
    defense: 'D',
  },

  BuildMenu: {
    title: 'Build here',
    close: 'Close',
  },

  SlotMenu: {
    title: 'Manage industry',
    close: 'Close',
  },

  Labels: {
    materialSuffix: (cost: number) => ` - ${cost} material`,
    sell: (refund: number) => `Sell +${refund}`,
  },

  InfoPanel: {
    title: 'Planet',
    owner: 'Owner',
    resources: 'Resources',
    industries: 'Industries',
    fleet: 'Fleet',
    enemy: 'Enemy',
    inbound: 'Inbound',
    target: 'Target',
    removeTarget: 'Remove target',
    unminedOre: 'Unmined ore',
    material: 'Material',
    energy: 'Energy',
    freeSlot: 'Free slot',
    free: 'Free',
    building: (pct: number) => `Build ${pct}%`,
    waiting: 'Waiting',
    producing: (pct: number) => `Prod ${pct}%`,
    buildingShip: (pct: number) => `Build ship ${pct}%`,
    shipReady: 'Ship ready',
    active: 'Active',
    spaceport: 'Spaceport',
    missing: 'Missing',
    unknown: 'Unknown',
    extractor: 'Extractor',
    collector: 'Collector',
    colonizerFactory: 'Colonizer',
    hunterFactory: 'Hunter',
    bomberFactory: 'Bomber',
    planetaryDefenseGun: 'Defense',
    hunter: 'Hunter',
    bomber: 'Bomber',
    colonizer: 'Colonizer',
    freighter: 'Freighter',
    ownerPlayer: 'Player',
    ownerComputer: 'Computer',
    ownerNone: 'Uninhabited',
    unseen: 'Unseen',
    noLiveInformation: 'No live information',
    revealing: (pct: number) => `Revealing ${pct}%`,
    panelMissing: 'Info panel missing',
  },
};
