package space.model;

public class Ship {
	Position center;
	Direction forward = new Direction(1,0);
	Direction turnTo = new Direction(0,1);
	float goalSpeed = 0;
	float speed = 0;
	float acceleration = 1.0f;
	float turnSpeed = 30.0f;
	private boolean isAlive;
	
	
	public Ship(Position start) {
		center = new Position(start.x, start.y);
		isAlive = true;
	}

	public Position getPosition() {
		return center;
	}

	public void setAimDirection(Position aimAt) {
		float distance = center.distanceTo(aimAt);
		if (distance > 0.0f) {
			turnTo = center.getDirectionTo(aimAt);
			goalSpeed = distance;
		} else {
			goalSpeed = 0;
		}
	}

	public void update(float dt) {
		if (isAlive() == false)
			return;
		
		center.x += forward.getX() * dt * getSpeed();
		center.y += forward.getY() * dt * getSpeed();
		
		if (forward.turnTowards(turnTo, dt * turnSpeed) ) {
			float speedChange = acceleration * dt;	
			if (speed - speedChange > goalSpeed) {
				speed -= speedChange;
			} else if (speed +speedChange < goalSpeed) {
				speed += speedChange;
			} else {
				speed = goalSpeed;
			}
		} 
	}

	private float getSpeed() {
		return speed;
	}

	public Direction getDirection() {
		return forward;
	}

	public float getRadius() {
		return 0.003f;
	}


	public boolean isToClose(Ship other) {
		if (isToClose(other.center, getRadius())) {
			return true;
		}
		return false;
	}
	
	public boolean isToClose(Position other, float otherRadius) {
		if (center.distanceTo(other)  < getRadius() + otherRadius) {
			return true;
		}
		return false;
	}

	public float getShipSpeed() {
		return speed;
	}

	public void kill() {
		this.isAlive = false;
	}
	
	public boolean isAlive() {
		return isAlive;
	}


	public float getWeaponRange() {
		return 0.05f;
	}

	

	
}
