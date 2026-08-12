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

  Buttons: {
    extractor: 'Build extractor (E)',
    refinery: 'Build refinery (R)',
    collector: 'Build collector (L)',
    colonizer: 'Build colonizer (C)',
    hunter: 'Build hunter (H)',
    bomber: 'Build bomber (B)',
    sell: 'Sell industry (S)',
  },

  Labels: {
    materialSuffix: (cost: number) => ` - ${cost} material`,
    sellButton: (refund: number) => `Sell industry (S) - ${refund} material`,
    sell: (refund: number) => `Sell +${refund}`,
  },

  InfoPanel: {
    title: 'Planet',
    owner: 'Owner',
    resources: 'Resources',
    industries: 'Industries',
    build: 'Build',
    target: 'Target',
    removeTarget: 'Remove target',
    unminedOre: 'Unmined ore',
    minedOre: 'Mined ore',
    material: 'Material',
    energy: 'Energy',
    freeSlot: 'Free slot',
    free: 'Free',
    building: (pct: number) => `Building ${pct}%`,
    producing: (pct: number) => `Producing ${pct}%`,
    buildingShip: (pct: number) => `Building ship ${pct}%`,
    shipReady: 'Ship ready',
    spaceport: 'Spaceport',
    missing: 'Missing',
    unknown: 'Unknown',
    extractor: 'Extractor',
    refinery: 'Refinery',
    collector: 'Collector',
    colonizerFactory: 'Colonizer factory',
    hunterFactory: 'Hunter factory',
    bomberFactory: 'Bomber factory',
    ownerPlayer: 'Player',
    ownerComputer: 'Computer',
    ownerNone: 'Uninhabited',
    panelMissing: 'Info panel missing',
  },
};
