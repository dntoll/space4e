package space.model;

public class Pilot {
	private Planet home;
	private Ship my;
	
	
	public Pilot(Planet home, Ship my) {
		this.home = home;
		this.my = my;
	}
	
	public void update(float dt, ShipCollection friends,
			ShipCollection opponents, Space space) {
		
		if (my.isAlive()== false) {
			return;
		}
		
		
		
		if (my instanceof Colonizer)
			try {
				doColonizer();
			} catch (WrongOwnerException e) {
				// TODO Auto-generated catch block
			//	e.printStackTrace();
			}
		if (my instanceof Hunter)
			doHunt(opponents);
		if (my instanceof Bomber)
			doBomber();
	}

	private void doHunt(ShipCollection opponents) {
		
		Ship closestOppponent = opponents.getClosest(my.getPosition());
		
		if (closestOppponent != null) {
			my.setAimDirection(closestOppponent.getPosition());
			
			if (my.getPosition().distanceTo(closestOppponent.getPosition()) < my.getWeaponRange()) {
				closestOppponent.kill();
			}
			
		} else {
			goToTargetPlanet();
		}
		
	}

	private void goToTargetPlanet() {
		Planet aimAt = home.getTargetPlanet();
		my.setAimDirection(aimAt.getPosition());
	}
	
	private void doBomber() {
		goToTargetPlanet();
		Planet aimAt = home.getTargetPlanet();
		
		if (my.getPosition().distanceTo(aimAt.getPosition()) < aimAt.getRadius()) {
			if (aimAt.getOwner() != home.getOwner()) {
				if (aimAt.hasAFactories() == true) {
				
					aimAt.killFactory();
				}
			}
		}
	}

	private void doColonizer() throws WrongOwnerException {
		goToTargetPlanet();
		Planet aimAt = home.getTargetPlanet();
		
		if (my.getPosition().distanceTo(aimAt.getPosition()) < aimAt.getRadius()) {
			if (aimAt.getOwner() != home.getOwner()) {
				if (aimAt.hasAFactories() == false) {
				
					aimAt.setOwner(home.getOwner());
					aimAt.setTarget(aimAt, home.getOwner());
					my.kill();
				}
			}
		}
	}
}
