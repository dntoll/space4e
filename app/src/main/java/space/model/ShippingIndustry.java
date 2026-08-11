package space.model;

public abstract class ShippingIndustry extends Industry {
	float timeToCompletion = 3;
	protected Ship currentShip;
	private ShipCollection allies;
	private PilotCollection pilots;
	
	
	
	public ShippingIndustry(ShipCollection allies, PilotCollection pilots) {
		this.allies = allies;
		this.pilots = pilots;
	}

	@Override
	public void update(float dt, Position planet, Planet homePlanet ) {
		if (currentShip == null  || currentShip.isAlive() == false) {
			timeToCompletion -= dt;
			if (timeToCompletion < 0) {
				
				currentShip = createShip(planet);
				Pilot pilot = new Pilot(homePlanet, currentShip);
				allies.add(currentShip);
				pilots.add(pilot);
				
			}
		}
	}

	protected abstract Ship createShip(Position planet);

}
