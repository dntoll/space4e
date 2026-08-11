package space.model;


public class BomberIndustry extends ShippingIndustry {

	public BomberIndustry(ShipCollection allies, PilotCollection pilots) {
		super(allies, pilots);
	}
	
	protected Ship createShip(Position planet) {
		timeToCompletion = 10.0f;
		return new Bomber(planet);
	}

}
