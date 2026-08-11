package space.model;

import java.util.ArrayList;

public class ShipCollection extends ArrayList<Ship>{
	
	/**
	 * 
	 */
	private static final long serialVersionUID = 5443008628212577440L;

	public ShipCollection() {
			
	}
	
	public void update(float dt) {
		for (Ship s : this) {
			s.update(dt);
		}
    }

	public Ship getClosest(Position pos) {
		Ship ret = null;
		float minDistance = Float.MAX_VALUE;
		for (Ship s : this) {
			float distance = pos.distanceTo(s.center);
			if (s.isAlive() &&  distance < minDistance) {
				minDistance = distance;
				ret = s;
			}
		}
		
		return ret;
	}
}
