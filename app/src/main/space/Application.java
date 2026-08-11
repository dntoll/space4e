package space;

import java.awt.Frame;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

import com.jogamp.opengl.GL2;
import static com.jogamp.opengl.GL2.*;
import com.jogamp.opengl.GLAutoDrawable;
import com.jogamp.opengl.GLCapabilities;
import com.jogamp.opengl.GLEventListener;
import com.jogamp.opengl.GLProfile;
import com.jogamp.opengl.awt.GLCanvas;
import com.jogamp.opengl.glu.GLU;

import space.controller.PlanetResourceAllocator;
import space.view.Camera;


import com.jogamp.opengl.util.FPSAnimator;


public class Application implements GLEventListener  {
	private space.model.Game model;
	private space.view.Game view;
	private space.view.Input input;
	private PlanetResourceAllocator controller;
	long previousTime;
	
	static int width = 300;
	static int height = 300;


    public static void main(String[] args) throws Exception {
        GLProfile glp = GLProfile.getDefault();
        GLCapabilities caps = new GLCapabilities(glp);
        GLCanvas canvas = new GLCanvas(caps);

        Frame frame = new Frame("AWT Window Test");
        frame.setSize(Application.width, Application.height);
        frame.add(canvas);
        frame.setVisible(true);

        frame.addWindowListener(new WindowAdapter() {
            public void windowClosing(WindowEvent e) {
                System.exit(0);
            }
        });

        canvas.addGLEventListener(new Application(canvas));

        FPSAnimator animator = new FPSAnimator(canvas, 60);
        animator.start();
        
        
    }
    
    public Application(GLCanvas c) throws Exception {
    	model = new space.model.Game();
    	input = new space.view.Input();
    	view = new space.view.Game(model, new Camera(width, height), input);
    	
    	controller = new space.controller.PlanetResourceAllocator(model, view);
    	
    	c.addMouseListener(input);
    	c.addMouseMotionListener(input);
    	c.addKeyListener(input);
    	
    	
    }

    @Override
    public void display(GLAutoDrawable drawable) {
    	long currentTime = System.currentTimeMillis();
        
    	controller.update((float)((currentTime - previousTime) / 1000.0f));
        view.render(drawable);
        
        previousTime = currentTime;
    }

    @Override
    public void dispose(GLAutoDrawable drawable) {
    }

    @Override
    public void init(GLAutoDrawable drawable) {
    	
    	reshape(drawable, 0, 0 , width, height);
    }

    @Override
    public void reshape(GLAutoDrawable drawable, int x, int y, int w, int h) {
    	
    	 GL2 gl = drawable.getGL().getGL2();
         GLU glu = new GLU();
         
        // gl.glViewport(0, 0, w, h);
              
         gl.glMatrixMode(GL_PROJECTION);
         gl.glLoadIdentity(); // reset
         glu.gluOrtho2D (0.0, w, h, 0);  // define drawing area
         
         gl.glMatrixMode(GL_MODELVIEW);
         gl.glLoadIdentity(); // reset
         
         view.setCamera(new Camera(w, h));
         previousTime = System.currentTimeMillis();
    }
}
