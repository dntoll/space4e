package space.model;

import java.util.List;
import java.util.Random;


public class Game {
	
	
	Space space;
	PilotCollection pilots = new PilotCollection();
	ShipCollection playerShips = new ShipCollection();
	ShipCollection computerShips = new ShipCollection();
	
	
	public Game() {
		space = new Space();
	}
    
	public void update(float dt) {
		
		pilots.update(dt, playerShips, computerShips, space);
		
		playerShips.update(dt);
		computerShips.update(dt);
		space.update(dt);
		
		List<Planet> planets = space.getPlanetsThatBelongTo(Owner.Computer);
		List<Planet> uncontested = space.getPlanetsThatBelongTo(Owner.None);
		Random r = new Random();
		for(Planet p : planets) {
			try {
				
				if (p.getTarget() == p || p.getTarget().hasAFactories()) {
					if (uncontested.size() > 0) {
						Planet target = uncontested.get(0);
						if (uncontested.size() > 1)
							target  = uncontested.get(r.nextInt(uncontested.size()-1));
						p.setTarget(target, Owner.Computer);
					}
				}
				
				p.buildIndustry(new ColonizerIndustry(computerShips, pilots), Owner.Computer);
			} catch (IndustryIndexIsTakenException | WrongOwnerException e) {
				// TODO Auto-generated catch block
				//e.printStackTrace();
			}
		}
    }

	

	public Space getSpace() {
		return space;
	}

	public ShipCollection getPlayerShips() {
		return playerShips;
	}

	public ShipCollection getComputerShips() {
		return computerShips;
	}

	public PilotCollection getPilots() {
		return pilots;
	}

	

	

}
