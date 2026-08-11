package space.model;

public class HunterIndustry extends ShippingIndustry{

	public HunterIndustry(ShipCollection allies, PilotCollection pilots) {
		super(allies, pilots);
	}

	@Override
	protected Ship createShip(Position planet) {
		timeToCompletion = 3.0f;
		
		return new Hunter(planet);
	}


}
