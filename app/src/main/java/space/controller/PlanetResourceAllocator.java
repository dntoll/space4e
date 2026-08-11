package space.controller;


import space.model.BomberIndustry;
import space.model.ColonizerIndustry;
import space.model.Game;
import space.model.HunterIndustry;
import space.model.IndustryIndexIsTakenException;
import space.model.Owner;
import space.model.Planet;
import space.model.WrongOwnerException;

public class PlanetResourceAllocator {

	private Game model;
	private space.view.Game view;

	public PlanetResourceAllocator(Game model, space.view.Game view) {
		this.model = model;
		this.view = view;
	}

	public void update(float dt) {
		model.update(dt);
		view.update(dt);
		
		Planet focusPlanet = view.getFocus();
		
		try {
		
			if (view.playerSetsTarget()) {
				Planet targetPlanet = view.getTarget();
				
				focusPlanet.setTarget(targetPlanet, Owner.Player);
				view.setFocus(null);
			}	
			
			if (focusPlanet != null) {
				if (view.playerBuildsColonizer()) {
					focusPlanet.buildIndustry(new ColonizerIndustry(model.getPlayerShips(), model.getPilots()), Owner.Player);
				}
				if (view.playerBuildsHunter()) {
					focusPlanet.buildIndustry(new HunterIndustry(model.getPlayerShips(), model.getPilots()), Owner.Player);
				}
				if (view.playerBuildsBomber()) {
					focusPlanet.buildIndustry(new BomberIndustry(model.getPlayerShips(), model.getPilots()), Owner.Player);
				}
			}
		} catch (IndustryIndexIsTakenException e) {
			e.printStackTrace();
		} catch (WrongOwnerException e) {
			e.printStackTrace();
		}
		
	}

	

}
