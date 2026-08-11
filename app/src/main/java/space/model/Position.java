package space.model;




public class Position  {
	
	public float x;
	public float y;

	public Position(float x, float y) {
		this.x = x;
		this.y = y;
	}

	public Direction getDirectionTo(Position aimAt) {
		
		return new Direction (aimAt.x - x, aimAt.y - y) ;
	}

	public float distanceTo(Position aimAt) {
		return (float) Math.sqrt((x - aimAt.x) * (x - aimAt.x) + (y - aimAt.y) * (y - aimAt.y));
	}

}
