package space.model;

import java.util.HashMap;

public class Planet {
	private Position position;
	private float radius;
	private Industry parts[];
	private Planet target = this;
	private Owner owner = Owner.None;
	
	public Planet(float x, float y, float radius) {
		this.position = new Position(x, y);
		this.radius = radius;
		parts = new Industry[3];
		
		for (int i = 0; i< parts.length; i++) {
			parts[i] = new FreeIndustry();
		}
	}

	public Position getPosition() {
		return position;
	}

	public float getRadius() {
		return radius;
	}
	
	public Industry[] getParts() {
		return parts;
	}

	public Planet getTarget() {
		return this.target;
	}
	
	public void setTarget(Planet newTarget, Owner owner) throws WrongOwnerException {
		if (owner != this.owner) {
			throw new WrongOwnerException();
		}
		
		if (newTarget != this && newTarget.getTarget() == this)
			newTarget.setTarget(newTarget, owner);
		this.target = newTarget;
	}
	
	public Position getTargetPosition() {
		Planet shipTarget = getTargetPlanet();
		return shipTarget.getPosition();
	}

	public Planet getTargetPlanet() {
		Owner followMyOnly = this.getOwner();
		Planet shipTarget = this;
		HashMap<Planet, Planet> hm = new HashMap<Planet, Planet>(); 
		
		while (shipTarget.getTarget() != shipTarget) {
			//no infinite loops allowed
			if (hm.containsKey(shipTarget.getTarget())) {
				break;
			}
			if (shipTarget.getOwner() != followMyOnly) {
				break;
			}
			hm.put(shipTarget.getTarget(), shipTarget.getTarget());
			shipTarget = shipTarget.getTarget();
		}
		return shipTarget;
	}
	
	

	private void setIndustry(Industry toBuild) throws IndustryIndexIsTakenException {
		int index = getFreeIndustryIndex();
		parts[index] = toBuild;
	}

	public void update(float dt) {
		for (int i= 0; i < parts.length; i++) {
			parts[i].update(dt, position, this);
		}
	}

	private int getFreeIndustryIndex() throws IndustryIndexIsTakenException {
		for (int i= 0; i < parts.length; i++) {
			if (parts[i] instanceof FreeIndustry)
				return i;
		}
		throw new IndustryIndexIsTakenException();
	}

	public void setOwner(Owner owner) {
		this.owner = owner;
	}

	public Owner getOwner() {
		return this.owner;
	}

	public void buildIndustry(Industry toBuild, Owner player) throws IndustryIndexIsTakenException, WrongOwnerException {
		if (player == this.owner)
			setIndustry(toBuild);
		else 
			throw new WrongOwnerException();
	}

	public boolean hasAFactories() {
		for (int i= 0; i < parts.length; i++) {
			if (!(parts[i] instanceof FreeIndustry))
				return true;
		}
		return false;
	}

	public void killFactory() {
		for (int i= 0; i < parts.length; i++) {
			if (!(parts[i] instanceof FreeIndustry))
				parts[i] = new FreeIndustry();
		}
	}

}
