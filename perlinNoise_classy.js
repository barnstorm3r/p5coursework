// This sketch borrows heavily from yasai's perlin noise sketch
// Tony R. 2018
// refactored by Barnaby Collins, 2019
'use strict';



/** Class to create a Perlin Noise sketch */
class PerlinNoise {
    /**
    * Create new Perlin Noise sketch
    * @param {number} [seed=1337] - The seed to use to generate the noise: must be a number, not a string
    * @param {number} [numParticles=100] - The number of particles to generate (default: 100)
    * @param {number} [mode=0] - The mode to use: 0 for particles spawning at the top, 1 for particles spawning everywhere
    * @param {number} [minLife=0] - The minimum life to assign to each particle (default: 0)
    * @param {number} [maxLife=10] - The maximum life to assign to each particle (default: 10)
    * @param {number} [noiseScale=200] - The scale of the Perlin Noise relative to pixels (default: 200)
    * @param {number} [simulationSpeed=0.2] - A multiplier for the speed at which particles travel (default: 0.2)
    * @param {number} [paddingY=30] - The vertical padding to add inside the canvas at the top and bottom
    * @param {number} [paddingX=30] - The horizontal padding to add inside the canvas at the left and right sides
    * @param {color} [defaultColour=white] - The colour to use for non-coloured particles
    * @param {color} [colourL=cyan] - The colour to give particles travelling left
    * @param {color} [colourR=purple] - The colour to give particles travelling right
    */
    constructor (seed, numParticles, mode, minLife, maxLife, noiseScale, simulationSpeed, paddingY, paddingX, defaultColour, colourL, colourR) {
        this.seed = seed || 1337;                                       // seed for use by random() and noise()
        this.numParticles = numParticles || 100;                        // number of particles to instantiate
        this.mode = mode || 0;                                          // mode to use (are particles spawning everywhere (1) or just at the top (0)?)
        this.minLife = minLife || 0;                                    // minimum life for each particle
        this.maxLife = maxLife || 10;                                   // maximum life for each particle
        this.noiseScale = noiseScale || 200;                            // constant to scale noise with
        this.simulationSpeed = simulationSpeed || 0.2;                  // constant to scale particle velocities with
        this.paddingY = paddingY || 30;                                 // padding on top & bottom of box
        this.paddingX = paddingX || 30;                                 // padding on sides of box
        this.defaultColour = defaultColour || color('white');           // colour for non-coloured particles
        this.colourL = colourL || color('cyan');                        // colour for moving left
        this.colourR = colourR || color('purple');                      // colour for moving right
        this.particles = [];                                            // array to put particles in
        this.fadeFrame = 0;                                             // iterating variable to count frames
        this.fillRect = 'rect(0,0,width,height);';                       // variable to be used in draw() to allow for efficient implementation of p5.Renderer support
        this.backgroundColour = color('black');                         // background colour
        // (bg cannot be changed due to the implementation of fading which darkens the whole sketch every few frames)

        // arrays containing the names of valid variables for the get and set functions
        this.numbers = ['seed', 'numParticles', 'mode', 'minLife', 'maxLife', 'noiseScale', 'simulationSpeed', 'paddingY', 'paddingX'];
        this.colours = ['defaultColour', 'colourL', 'colourR'];

        this.element = document.getElementById('p5_loading');
        if (this.element) {
            this.element.parentNode.removeChild(this.element);
        }

        randomSeed(this.seed);
        noiseSeed(this.seed);

        background(this.backgroundColour);
        
        noStroke();
        smooth();
        
        // generate particles
        for(var i = 0; i < this.numParticles; i++){
            // initialise particle with reference to this object so it can access variables
            var p = new Particle(this);
            p.pos.x = random(this.paddingX, width-this.paddingX);
            if (this.mode) {
                p.pos.y = random(this.paddingY, width-this.paddingY);
            }
            else {
                p.pos.y = this.paddingY;
            }
            this.particles[i] = p;
        }
    } // end constructor

    /**
     * To be put inside the p5 draw() function
     * @param {p5.Renderer} [r] - Optional renderer to pass in so we can use the Perlin Noise as a texture
     */
    draw(r) {/* 
        if (this.fadeFrame == 0 && r) {              // set renderer on the first frame
            this.fillRect = 'r.' + this.fillRect;
        }
        ++this.fadeFrame;               // increment fadeFrame
        if(this.fadeFrame % 5 == 0){    // every 5th frame,
            
            blendMode(DIFFERENCE);      // fade past particle trails
            fill(1, 1, 1);
            eval(this.fillRect);

            blendMode(LIGHTEST);
            fill(this.backgroundColour);
            eval(this.fillRect);
        } */
        
        r.blendMode(BLEND);
        
        // iterate through particles
        for(var i = 0; i < this.numParticles; i++){
            // iterations and radius both dependent on the particle's index
            // (as they are randomly placed this ensures we have an even spread of properties without creating patterns)
            var iterations = map(i,0,this.numParticles,5,1);
            var radius = map(i,0,this.numParticles,2,6);
            
            this.particles[i].move(iterations);
            this.particles[i].checkEdge();
            
            // work out the colour the particle should have based on its heading
            var particle_heading = this.particles[i].vel.heading()/PI;
            if(particle_heading < 0){
                particle_heading *= -1;
            }
            var particle_color = lerpColor(this.particles[i].color1, this.particles[i].color2, particle_heading);
            
            // work out how bright (opaque) the particle should be based on its life:
            // dark initially and finally, and bright otherwise
            var fade_ratio;
            fade_ratio = min(this.particles[i].life * 5 / this.maxLife, 1);
            fade_ratio = min((this.maxLife - this.particles[i].life) * 5 / this.maxLife, fade_ratio);
    
            // show the particle now that colour etc has been processed
            r.fill(red(particle_color), green(particle_color), blue(particle_color), 255 * fade_ratio);
            this.particles[i].display(radius, r);
        }
    } // end draw

    /**
     * Sets the value of one of the class parameters, and ensures updated values are actually propagated if their values only get used at the start.
     * @param {string} name - The name of the parameter you want to change
     * @param {*} value - The value you want to change it to
     */
    setParameter(name, value) {
        if (typeof value == 'undefined') {
            throw 'Error in PerlinNoise.setParameter: no value given';
        }
        // if we're expecting a number
        if (this.numbers.indexOf(name) !== -1) {
            if (typeof value == 'number') {
                eval('this.' + name + ' = ' + value.toString() + ';');

                if (name == 'seed') {
                    // update the seed if necessary
                    randomSeed(this.seed);
                    noiseSeed(this.seed);
                }
                else if (name == 'numParticles') {
                    // if we need to change the number of particles
                    if (value > this.particles.length) {
                        // add new particles to the array if necessary
                        for (i = this.particles.length; i < value; i++) {
                            var p = new Particle(this);
                            p.pos.x = random(this.paddingX, width-this.paddingX);
                            if (this.mode) {
                                p.pos.y = random(this.paddingY, height-this.paddingY);
                            }
                            else {
                                p.pos.y = this.paddingY;
                            }
                            this.particles[i] = p;
                        }
                    }
                    else {
                        // remove particles from the array if necessary
                        this.particles.length = value;
                    }
                }
            }
            else {
                throw ('Error in PerlinNoise.setParameter: value expected number but got ' + typeof value);
            }
        }
        // otherwise if we're looking for a colour
        else if (this.colours.indexOf(name) !== -1) {
            // no need for checking as color() already returns white with invalid values and it's hard to check colour values anyway
            eval('this.' + name + ' = color("' + value + '");');
        }
        else {
            throw ('Error in PerlinNoise.setParameter: variable name given (' + name +') does not exist');
        }
    } // end setParameter

    /**
     * Returns the value of one of the class parameters.
     * @param {string} name - Name of variable to get
     */
    getParameter(name) {
        // if name references a variable that exists
        if (this.strings.indexOf(name) !== -1 || this.numbers.indexOf(name) !== -1 || this.colours.indexOf(name) !== -1) {
            // return the value of that variable
            return eval('this.'+name);
        }
        else {
            throw ('Error in PerlinNoise.getParameter: variable name given (' + name +') does not exist');
        }
    } // end getParameter
} // end PerlinNoise



function Particle(p){
    // member properties and initialization
    this.vel = createVector(0, 0);
    this.pos = createVector(0, 0);
    this.life = random(p.minLife, p.maxLife);

    // run every frame
    this.move = function(iterations){
        // if dead, respawn
        if((this.life -= 0.01666) < 0) {
            this.respawn();
        }

        // while we still have iterations to use up
        while(iterations > 0) {
            
            // compute angle
            var transition = map(this.pos.x, p.paddingX, width - p.paddingX, 0.1, 0.9);
            var angle = noise(this.pos.x/p.noiseScale, this.pos.y/p.noiseScale)*transition*TWO_PI*p.noiseScale;
            //var transition = map(this.pos.y, height/5, height-paddingY, 0, 1, true);
            //var angle = HALF_PI;
            //angle += (noise(this.pos.x/noiseScale, this.pos.y/noiseScale)-0.5)*transition*TWO_PI*noiseScale/66;

            // work out the position we will be at as a result of this angle
            this.vel.x = cos(angle);
            this.vel.y = sin(angle);
            this.vel.mult(p.simulationSpeed);
            this.pos.add(this.vel);

            // decrement iterations
            --iterations;
        }
    };

    // respawn if we're near the edge
    this.checkEdge = function(){
        if(this.pos.x > width - p.paddingX
        || this.pos.x < p.paddingX
        || this.pos.y > height - p.paddingY
        || this.pos.y < p.paddingY){
            this.respawn();
        }
    };
    
    // alternative respawn function where we respawn anywhere in the canvas, not necessarily at the top
    this.respawn = function(){
        this.color1 = this.color2 = p.defaultColour;
        
        // at a 1/3 chance, make this a coloured particle
        if(int(random(3)) == 1){
            this.color1 = p.colourR;
            this.color2 = p.colourL;
        }

        this.pos.x = random(p.paddingX, width - p.paddingX);
        if (p.mode) {
            this.pos.y = random(p.paddingY, (height*0.7 - p.paddingY));
            // as particles tend to travel downwards, it is better to weight their spawn so they appear further up more often
        }
        else {
            this.pos.y = p.paddingY;
        }
        this.life = p.maxLife;
    };

    // actually show an ellipse at the position
    this.display = function(radius, r){
        if (r) {
            r.ellipse(this.pos.x, this.pos.y, radius, radius);
        }
        else {
            ellipse(this.pos.x, this.pos.y, radius, radius);
        }
        if (radius == 2) {
            console.log(this.pos);
        }
    };
    
    this.respawn();
}
