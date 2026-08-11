package space.view;

import space.model.Position;

public class Camera {

	private int screenSizeX;
	private int screenSizeY;
	
	
	public Camera(int screenSizeX, int screenSizeY) {
		this.screenSizeX = screenSizeX;
		this.screenSizeY = screenSizeY;
	}

	public Position viewToModel(ViewPosition vpos) {
		
		float scalex = screenSizeX;
		float scaley = screenSizeY;
		
		float x = vpos.x / scalex ;
		float y = vpos.y / scaley ;
		return new Position(x, y);
	}

	public ViewPosition modelToView(Position focus) {
		
		float scalex = screenSizeX;
		float scaley = screenSizeY;
		int x = (int) (focus.x * scalex) ;
		int y = (int) (focus.y * scaley) ;
		return new ViewPosition(x, y);
	}

	public float modelToView(float shipRadius) {
		
		float scalex = screenSizeX;
		int x = (int) (shipRadius * scalex) ;
		return x;
	}

}
