package space.view;

import java.awt.Point;

import space.model.Direction;

public class ViewPosition extends Point {

	private static final long serialVersionUID = -8868666459610317725L;

	public ViewPosition(Point mousePos) {
		this.x = mousePos.x;
		this.y = mousePos.y;
	}

	public ViewPosition(int x, int y) {
		this.x = x;
		this.y = y;
	}

	public ViewPosition(float x, float y) {
		this.x = (int) x;
		this.y = (int) y;
	}

	public static ViewPosition create(float length, Direction modelDir) {
		return new ViewPosition(modelDir.getX() * length, modelDir.getY() * length);
		
	}

	public ViewPosition add(ViewPosition other) {
		return new ViewPosition(this.x + other.x, this.y + other.y);
	}

	public Direction getDirectionTo(ViewPosition to) {
		return new Direction(to.x - x, to.y-y);
	}

}
