package space.model;

import java.util.ArrayList;

public class PilotCollection extends ArrayList<Pilot> {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1641642359174481273L;

	public void update(float dt, 
						ShipCollection friends,
						ShipCollection opponents, 
						Space space) {
		for (Pilot p : this) {
			p.update(dt, friends, opponents, space);
		}
	}

}
