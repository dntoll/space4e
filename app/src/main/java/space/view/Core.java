package space.view;

import java.awt.Graphics2D;
import java.awt.Color;
import java.util.Random;

import space.model.Direction;

public class Core {
	
	private java.awt.Graphics2D gl;
	private float timeElapsedTotal;

	public Core() {
		
		timeElapsedTotal = 0;
	}
	
	
	
	public void update(float dt) {
		timeElapsedTotal += dt;
	}

	public void drawTriangle(ViewPosition front,
			ViewPosition left, ViewPosition right, float r, float g, float b) {

		int[] xs = new int[]{front.x, right.x, left.x};
		int[] ys = new int[]{front.y, right.y, left.y};
		gl.setColor(new Color(r, g, b));
		gl.fillPolygon(xs, ys, 3);
	}
	
	public void drawArrow(ViewPosition from, ViewPosition to) {

		int[] xs = new int[]{from.x, to.x};
		int[] ys = new int[]{from.y, to.y};
		gl.setColor(new Color(0.25f,0.25f,0.25f));
		gl.drawPolygon(xs, ys, 2);
		/*gl.glLineWidth(1.5f); 
		gl.glBegin(GL.GL_LINES);
        gl.glColor3f(0.25f,0.25f,0.25f);
        gl.glVertex2d(from.x, from.y);
        gl.glColor3f(0.5f,0.5f,0.5f);
        gl.glVertex2d(to.x, to.y);
        gl.glEnd();*/
        
        /*int viewLen = (int) from.distance(to);
        gl.glBegin(GL.GL_TRIANGLES);
        int numObjects = viewLen / 10;
        Random r = new Random(10);
        
        Direction direction = from.getDirectionTo(to);
        
        for (int i = 0; i < numObjects; i++) {
        	float brightness = (float)i / (float)numObjects;
        	gl.glColor3f(brightness, brightness, brightness);
        	float speed = r.nextFloat() * 10.0f + 1.0f;
        	float onLinePosition = r.nextFloat() * viewLen + timeElapsedTotal * speed;
        	int lapse = (int )onLinePosition/viewLen;
        	onLinePosition = onLinePosition - viewLen * lapse;
        	
        	float size = 3;
        	ViewPosition randomness = new ViewPosition(r.nextFloat() * size * 2 - size,
        											   r.nextFloat() * size * 2 - size);
        	ViewPosition at = from.add(direction.mul(onLinePosition)).add(randomness);
        	
            gl.glVertex2d(at.x, at.y);
            gl.glVertex2d(at.x + size, at.y);
            gl.glVertex2d(at.x+size, at.y+size);
        }
        gl.glEnd();*/
	}

	public void fillCircle(ViewPosition center,
			float radius, float r, float g, float b) {

		gl.setColor(new Color(r, g, b));
		gl.fillArc(center.x, center.y, (int)radius, (int)radius, 0, 360);
	}
	
	public void drawCircle(ViewPosition center,
			float radius, float brightness) {
		gl.setColor(new Color(brightness, brightness, brightness));
		gl.drawArc(center.x, center.y, (int)radius, (int)radius, 0, 360);
	}

	public void setGraphics(Graphics2D gl) {
		this.gl = gl;
	}

    public void clear() {
    }
}
