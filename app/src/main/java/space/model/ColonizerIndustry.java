package space.model;

public class ColonizerIndustry extends ShippingIndustry {
	
	public ColonizerIndustry(ShipCollection allies, PilotCollection pilots) {
		super(allies, pilots);
	}

	protected Ship createShip(Position planet) {
		
		timeToCompletion = 30.0f;
		
		return new Colonizer(planet);
	}
}
