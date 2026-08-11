package space.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class Space {

	public static final int NUM_PLANETS = 20;
	
	Planet planets[];
	
	public Space() {
		Random r = new Random();
		
		planets = new Planet[NUM_PLANETS];
		for(int i = 0; i < NUM_PLANETS; i++) {
			planets[i] = new Planet(r.nextFloat(), r.nextFloat(), (float) (r.nextFloat() *0.02 + 0.02));
		}
		
		planets[0].setOwner(Owner.Player);
		
		planets[1].setOwner(Owner.Computer);
	}
	
	public Planet getPlanet(int i) {
		return planets[i];
	}

	public void update(float dt) {
		for(int i = 0; i < NUM_PLANETS; i++) {
			planets[i].update(dt);
		}
	}

	public List<Planet> getPlanetsThatBelongTo(Owner owner) {
		ArrayList<Planet> ret = new ArrayList<Planet>();
		for(int i = 0; i < NUM_PLANETS; i++) {
			if (planets[i].getOwner() == owner)
				ret.add(planets[i]);
		}
		return ret;
	}
}
