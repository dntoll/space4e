package space;

import javax.swing.JFrame;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.ActionEvent;
import java.awt.event.WindowEvent;

import space.controller.PlanetResourceAllocator;
import space.view.Camera;
import javax.swing.SwingUtilities;
import java.awt.geom.Line2D;
import javax.swing.Timer;

public class Application extends JFrame {
    

	private space.model.Game model;
	private space.view.Game view;
	private space.view.Input input;
	private PlanetResourceAllocator controller;
    private Timer timer;
	long previousTime;
	
	static int width = 800;
	static int height = 600;


    public static void main(String[] args) throws Exception {

        SwingUtilities.invokeLater(new Runnable() {
            @Override
            public void run() {
                new Application().setVisible(true);
            }
        });

    }
    
    public Application() {
        super("Space");
        
        
    	model = new space.model.Game();
    	input = new space.view.Input();
    	view = new space.view.Game(model, new Camera(width, height), input);
    	
    	controller = new space.controller.PlanetResourceAllocator(model, view);
    	

        setSize(Application.width, Application.height);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
    	addMouseListener(input);
    	addMouseMotionListener(input);
    	addKeyListener(input);
    	setVisible(true);
    	

        timer = new Timer(INTERVAL, new ActionListener() {
            public void actionPerformed(ActionEvent evt) {
                    repaint();
            
                    /*if ( condition to terminate the thread. ) {
                        timer.stop();
                    }*/
                }
            });
        
        timer.start();
    }

    private final static int INTERVAL = 10;



    @Override
    public void paint(Graphics g) {
        super.paint(g);
    	long currentTime = System.currentTimeMillis();
        
    	controller.update((float)((currentTime - previousTime) / 1000.0f));
        view.render(g);
        
        previousTime = currentTime;
    }

    @Override
    public void reshape (int x, int y, int width, int height) {
        super.reshape(x, y, width, height);
        revalidate();
        view.setCamera(new Camera(width, height));
         previousTime = System.currentTimeMillis();
    }
/*
    @Override
    public void dispose(GLAutoDrawable drawable) {
    }

    @Override
    public void init(GLAutoDrawable drawable) {
    	
    	reshape(drawable, 0, 0 , width, height);
    }

    
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
    }*/
}
