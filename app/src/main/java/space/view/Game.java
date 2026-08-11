package space.view;

import java.awt.Graphics;

import java.awt.Graphics2D;

import space.model.*;

public class Game {
	
	private space.model.Game model;
	private Camera camera;
	private Input input;
	private Core core = new Core();
	
	public Game(space.model.Game model, Camera camera, Input input) {
		this.model = model;
		this.camera = camera;
		this.input = input;
		
	}

	public void render(Graphics g) {
        Graphics2D g2d = (Graphics2D) g;
        core.setGraphics(g2d);

        core.clear();
        
        draw(model.getSpace());
        
        draw(model.getPlayerShips(), Owner.Player);
        draw(model.getComputerShips(), Owner.Computer);
    }

	private void draw(ShipCollection ships, Owner owner) {
		for (Ship s : ships) {
        	if (s.isAlive())
        		draw(s, owner);
        }
	}
	
	private void draw(Space space) {
		for (int i = 0; i< Space.NUM_PLANETS; i++) {
        	draw(space.getPlanet(i));
        }
	}

	private void draw(Planet planet) {
		ViewPosition modelCenter = camera.modelToView(planet.getPosition());
		
		float planetRadius = camera.modelToView(planet.getRadius());
        
        float r = 0.5f;
        float g = 0.5f;
        float b = 0.5f;
        if (planet.getOwner() == Owner.Player) {
        	r = 1;
        }
        if (planet.getOwner() == Owner.Computer) {
        	g = 1;
        }
        
        core.fillCircle(modelCenter, planetRadius, r, g, b);
        if (focus == planet) {
        	core.drawCircle(modelCenter, planetRadius+5, 1.0f);
        }
        
        Planet target = planet.getTarget();
        if (target != planet) {
	        ViewPosition targetCenter = camera.modelToView(target.getPosition());
	        core.drawArrow(modelCenter, targetCenter);
        }
        
        int index = 0;
        for (Industry i : planet.getParts()) {
        	if (!(i instanceof FreeIndustry)) {
        		float a = (float) ((index * 2.0 * Math.PI) / (float) planet.getParts().length);
        		ViewPosition center = modelCenter.add(new ViewPosition((int)((planetRadius/2) * Math.cos(a)), (int)((planetRadius/2) * Math.sin(a))) );
				core.fillCircle(center , planetRadius/2, r*0.75f, g*0.75f, b*0.75f);
				index++;
        	}
        }
	}

	

	private void draw(Ship ship, Owner owner) {
		ViewPosition modelcenter = camera.modelToView(ship.getPosition());
        Direction modelDir = ship.getDirection();
        
        float shipSizePixels = camera.modelToView(ship.getRadius());
        
        ViewPosition shipFront = modelcenter.add(ViewPosition.create(shipSizePixels, modelDir));
        ViewPosition shipBack = ViewPosition.create(-shipSizePixels, modelDir);
        
        ViewPosition shipLeft = shipBack.add(modelcenter.add(ViewPosition.create(shipSizePixels, modelDir.getRight())));
        ViewPosition shipRight = shipBack.add(modelcenter.add(ViewPosition.create(-shipSizePixels, modelDir.getRight())));

        //float speed = ship.getShipSpeed();
        
        float r = 0.5f;
        float g = 0.5f;
        float b = 0.5f;
        if (owner == Owner.Player) {
        	r = 1;
        }
        if (owner == Owner.Computer) {
        	g = 1;
        }
        // draw a triangle filling the window
        core.drawTriangle(shipFront, shipLeft, shipRight, r, g, b);
	}

	

	public Position getPlayerFocusPosition() {
		
		ViewPosition vpos = input.getMousePosition();
		
		return this.camera.viewToModel(vpos);
	}

	public void setCamera(Camera camera) {
		this.camera = camera;
	}

	private Planet focus, target;
	public boolean playerSetsTarget() {
		boolean hasFocus = focus != null;
		
		if (input.userReleasesButton()) {
			if (hasFocus) {
				//SELECT TO
				Position mp = getPlayerFocusPosition();
				Space space = model.getSpace();
				target = getClosestPlanet(mp, space);
				if (target == null) {
					//UNSELECT
					focus = null;
					return false;
				}
				return true;
			} else {
				//SELECT FROM
				Position mp = getPlayerFocusPosition();
				Space space = model.getSpace();
				focus = getClosestPlanet(mp, space);
				
			}
		}
		
		return false;
	}

	private Planet getClosestPlanet(Position mp, Space space) {
		for(int i = 0; i < Space.NUM_PLANETS; i++) {
			Planet p = space.getPlanet(i);
			
			if (p.getPosition().distanceTo(mp) < p.getRadius()) {
				return p;
			}
		}
		return null;
	}

	public Planet getFocus() {
		return focus;
	}

	public Planet getTarget() {
		return target;
	}

	public void setFocus(Planet targetPlanet) {
		focus = targetPlanet;
	}

	public boolean playerBuildsColonizer() {
		if (input.userPressKey('c')) {
			return true;
		}
		return false;
	}
	
	public boolean playerBuildsHunter() {
		if (input.userPressKey('h')) {
			return true;
		}
		return false;
	}
	public boolean playerBuildsBomber() {
		if (input.userPressKey('b')) {
			return true;
		}
		return false;
	}

	public void update(float dt) {
		core.update(dt);
	}

	

}
