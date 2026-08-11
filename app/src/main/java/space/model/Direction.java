package space.model;

import space.view.ViewPosition;

public class Direction {
	
	

	private float x;
	private float y;

	public Direction(float x, float y) {
		
		float len = (float) Math.sqrt(x * x + y * y);
		
		if (len > 0) {
		
			this.x = x/len;
			this.y = y/len;
		}
	}

	public float getX() {
		return x;
	}
	public float getY() {
		return y;
	}

	public Direction getRight() {
		return new Direction(-y, x);
	}
	

	public boolean turnTowards(Direction newDirection, float turnDegrees) {
		float currDegrees = toDegrees();
		float goalDegrees = newDirection.toDegrees();
		
		if (isCounterClockWise(goalDegrees, currDegrees + turnDegrees)) {
			fromDegrees( currDegrees + turnDegrees );
		} else if (isClockWise(goalDegrees, currDegrees - turnDegrees)) {
			fromDegrees( currDegrees - turnDegrees );
		} else {
			fromDegrees( goalDegrees );
			return true;
		}
		
		return false;
		
	}

	private boolean isClockWise(float aAngle, float bAngle) {
		
		float diff = aAngle - bAngle;
		
		if (diff < 0 && diff > -3.14f) {
			return true;
		} else if (diff >= 0 && diff < 3.14f) {
			return false;
		} if (diff < -3.14f) {
			return false;
		} 
		return true;
	}
	private boolean isCounterClockWise(float aAngle, float bAngle) {
		return !isClockWise(aAngle, bAngle);
	}

	private void fromDegrees(float f) {
		x = (float) Math.cos(f);
		y = (float) Math.sin(f);
		
	}

	private float toDegrees() {
		float rad= (float) Math.atan2(y, x);
		
		if (rad < 0) {
			rad += 2.0 * Math.PI;
		}
		
		return rad;
	}

	public ViewPosition mul(float m) {
		return new ViewPosition(x * m, y * m);
	}

}
