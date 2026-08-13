import {
  Bomber,
  BomberIndustry,
  Collector,
  Colonizer,
  ColonizerIndustry,
  Extractor,
  FreeIndustry,
  FreightShip,
  Hunter,
  HunterIndustry,
  Industry,
  IndustryConstruction,
  IndustryOrder,
  PlanetaryDefenseGun,
  Ship,
  Spaceport,
} from '../model/index.ts';
import { ViewStrings } from './view-strings.ts';

export function shipName(ship: Ship): string {
  if (ship instanceof Hunter) return ViewStrings.InfoPanel.hunter;
  if (ship instanceof Bomber) return ViewStrings.InfoPanel.bomber;
  if (ship instanceof Colonizer) return ViewStrings.InfoPanel.colonizer;
  if (ship instanceof FreightShip) return ViewStrings.InfoPanel.freighter;
  return ViewStrings.InfoPanel.unknown;
}

export function industrySymbol(industry: Industry): Industry {
  if (industry instanceof IndustryConstruction || industry instanceof IndustryOrder) return industry.getFactory();
  return industry;
}

export function industryName(industry: Industry): string {
  if (industry instanceof Extractor) return ViewStrings.InfoPanel.extractor;
  if (industry instanceof Collector) return ViewStrings.InfoPanel.collector;
  if (industry instanceof ColonizerIndustry) return ViewStrings.InfoPanel.colonizerFactory;
  if (industry instanceof HunterIndustry) return ViewStrings.InfoPanel.hunterFactory;
  if (industry instanceof BomberIndustry) return ViewStrings.InfoPanel.bomberFactory;
  if (industry instanceof PlanetaryDefenseGun) return ViewStrings.InfoPanel.planetaryDefenseGun;
  if (industry instanceof Spaceport) return ViewStrings.InfoPanel.spaceport;
  return ViewStrings.InfoPanel.unknown;
}

export function industryInfo(industry: Industry): { name: string; state: string } {
  if (industry instanceof FreeIndustry) {
    return { name: ViewStrings.InfoPanel.freeSlot, state: ViewStrings.InfoPanel.free };
  }
  if (industry instanceof IndustryOrder) {
    return { name: industryName(industry.getFactory()), state: ViewStrings.InfoPanel.waiting };
  }
  if (industry instanceof IndustryConstruction) {
    const progress = Math.round(industry.getProgress() * 100);
    return { name: industryName(industry.getFactory()), state: ViewStrings.InfoPanel.building(progress) };
  }
  const progress = Math.round(industry.getProgress() * 100);
  const name = industryName(industry);
  if (industry instanceof Extractor || industry instanceof Collector) {
    return { name, state: ViewStrings.InfoPanel.producing(progress) };
  }
  if (industry instanceof PlanetaryDefenseGun) {
    return { name, state: ViewStrings.InfoPanel.active };
  }
  if (progress >= 100) return { name, state: ViewStrings.InfoPanel.shipReady };
  return { name, state: ViewStrings.InfoPanel.buildingShip(progress) };
}

export function sellRefund(industry: Industry): number {
  if (industry instanceof IndustryOrder) return 0;
  const cost = industry instanceof IndustryConstruction
    ? industry.getFactory().getMaterialCost()
    : industry.getMaterialCost();
  return Math.floor(cost / 2);
}
