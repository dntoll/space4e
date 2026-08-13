export const GameConstants = {
  Inventory: {
    Capacity: 100,
  },

  Planet: {
    MinSlots: 3,
    MaxSlots: 5,
  },

  Space: {
    NumPlanets: 20,
    SpaceRadius: 1.5,
    MinPlanetSpacing: 0.3,
    MinPlanetRadius: 0.04,
    PlanetRadiusVariance: 0.05,
    UnminedOreMin: 20,
    UnminedOreRange: 100,
    CollectionPotentialMin: 0.05,
    CollectionPotentialRange: 0.35,
  },

  StartingPlanet: {
    Material: 12,
    Energy: 20,
    UnminedOre: 80,
    CollectionPotential: 0.3,
  },

  Industry: {
    ConstructionTime: 2,
  },

  ShippingIndustry: {
    DefaultProductionDuration: 3,
  },

  Extractor: {
    MiningRate: 0.5,
    MaterialPerOre: 0.8,
    MaterialCost: 3,
  },

  Collector: {
    MaterialCost: 3,
  },

  ColonizerIndustry: {
    ProductionDuration: 30,
    MaterialCost: 6,
  },

  HunterIndustry: {
    ProductionDuration: 3,
    MaterialCost: 3,
  },

  BomberIndustry: {
    ProductionDuration: 10,
    MaterialCost: 4,
  },

  Spaceport: {
    ProductionDuration: 8,
    MaterialCost: 0,
  },

  FreightShip: {
    CargoCapacity: 10,
  },

  Ship: {
    OrbitReferenceRadius: 0.05,
    OrbitReferenceSpeed: 0.04,
    Radius: 0.003,
    WeaponRange: 0.05,
    TurnSpeedDegrees: 30,
    MaxEnergy: 1,
    TravelCostPerDistance: 0.25,
    OrbitRadiusMultiplier: 1.6,
    CloseOrbitThresholdMultiplier: 1.2,
    SpawnDistanceMultiplier: 1.25,
  },

  Hunter: {
    TargettableDistance: 0.1,
    TurnSpeedDegrees: 90,
  },

  Bomber: {
    TurnSpeedDegrees: 60,
  },

  PlanetaryDefenseGun: {
    MaterialCost: 5,
    Range: 0.06,
    ShotCooldown: 1,
    ShotEffectDuration: 0.3,
  },

  Computer: {
    PdcBuildChance: 0.02,
  },
};
