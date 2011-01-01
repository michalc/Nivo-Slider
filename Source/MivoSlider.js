/*
 * MooTools Port of Nivo Slider
 * Port by Michal Charemza
 * 
 * jQuery Nivo Slider v2.3
 * http://nivo.dev7studios.com
 *
 * Copyright 2010, Gilbert Pellegrom
 * Free to use and abuse under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * May 2010 - Pick random effect from specified set of effects by toronegro
 * May 2010 - controlNavThumbsFromRel option added by nerd-sh
 * May 2010 - Do not start nivoRun timer if there is only 1 slide by msielski
 * April 2010 - controlNavThumbs option added by Jamie Thompson (http://jamiethompson.co.uk)
 * March 2010 - manualAdvance option added by HelloPablo (http://hellopablo.co.uk)
 */

var MivoSlider = new Class({
	
	Implements: [Options, Events, Class.Occlude],
	
	options: {
		effect: 'random',
		slices: 15,
		animSpeed: 500,
		pauseTime: 3000,
		startSlide: 0,
		directionNav: true,
		directionNavHide: true,
		controlNav: true,
		controlNavThumbs: false,
		controlNavThumbsFromRel: false,
		controlNavThumbsSearch: '.jpg',
		controlNavThumbsReplace: '_thumb.jpg',
		keyboardNav: true,
		pauseOnHover: true,
		manualAdvance: false,
		captionOpacity: 0.8,
		
		randomEffects: ["sliceDownRight","sliceDownLeft","sliceUpRight","sliceUpLeft","sliceUpDown","sliceUpDownLeft","fade"],
		
		effectOptions: {
			slideUp: {
				slices: 15,
				fx: {
					duration: 500
				}
			}
		},
		
		onBeforeChange: Function.from(),
		onAfterChange: Function.from(),
		onSlideshowEnd: Function.from(),
	    onLastSlide: Function.from(),
	    onAfterLoad: Function.from()
	},
	
	initialize: function(element, options) {
		this.setOptions(options);
		if (this.occlude('mivoSlider', element)) return this.occluded;

		// Useful variables. Play carefully.
		this.currentSlide = 0;
		this.previousSlide = 0;
		this.currentImage = '';
		this.previousImage = '';
		this.totalSlides = 0;
		this.randAnim = '';
		this.running = false;
		this.paused = false;
		this.stop = false;
		this.timer = 0;
		this.captionChain = new Chain();
   
		// Get this slider
		var slider = this.slider = this.element = document.id(element);
		slider.setStyle('position','relative');
		slider.addClass('nivoSlider');
       
		// Find our slider children
		slider.getElements('> a').addClass('nivo-imageLink');
		var kids = this.kids = slider.getElements(('> img, > a > img'));
		var links = this.links = kids.map(function(child) {return child.getParent().get('tag') == 'a' ? child.getParent() : null});
		this.totalSlides = kids.length;
		var maxWidth = kids.map(function(child) {return child.getCoordinates().height || child.get('height')}).max();
		var maxHeight = kids.map(function(child) {return child.getCoordinates().width || child.get('width')}).max();
		if (maxWidth > 0) slider.setStyle('width', maxWidth);
		if (maxHeight > 0) slider.setStyle('height', maxHeight);
		kids.setStyle('display', 'none');
		$$(links.clean()).setStyle('display','none');

		// Set startSlide
		this.options.currentSlide = this.options.startSlide = [this.options.startSlide, this.totalSlides - 1].max();
		
		// Get initial image
		this.currentImage = kids[this.currentSlide];
		
		// Show initial link
		if (links[this.currentSlide]) links[this.currentSlide].setStyle('display','block');
		
		// et first background
		slider.setStyle('background','url("'+ this.currentImage.get('src') +'") no-repeat');
       
		// Create effects
		this.effects = this.options.effect == "random" ? this.options.randomEffects : [this.options.effect];
		this.effects = this.effects.map(function(effect) {return new MivoSlider.Effects[effect](this, this.options.effectOptions[effect])}.bind(this));
		this.numEffects = this.effects.length;

		// Create caption
		this.captionText = new Element('p');
		this.caption = new Element('div.nivo-caption',{styles: {opacity:0}});
		this.caption.grab(this.captionText);
		slider.grab(this.caption);
		this.captionTextTween = new Fx.Tween(this.captionText, {duration: this.options.animSpeed, onComplete: this.captionChain.callChain.bind(this.captionChain)});
		this.captionTween = new Fx.Tween(this.caption, {duration: this.options.animSpeed, onComplete: this.captionChain.callChain.bind(this.captionChain)})
		
		//Process initial caption
		this.showCurrentCaption();
		
		//In the words of Super Mario "let's a go!"
		this.start();

       //Add Direction nav
       if (this.options.directionNav) {
			this.directionNav = new Element('div.nivo-directionNav',{html: '<a class="nivo-prevNav">Prev</a><a class="nivo-nextNav">Next</a></div>'});
			slider.grab(this.directionNav);
           
           //Hide Direction nav
			if (this.options.directionNavHide) {
				slider.getElement('.nivo-directionNav').setStyle('display','none');
				slider.addEvents({
					mouseenter: function() {
						this.directionNav.setStyle('display','block');
					}.bind(this),
					mouseleave: function() {
						this.directionNav.setStyle('display','none');
					}.bind(this)
				});
			}
           
			slider.addEvent('click:relay(a.nivo-prevNav)', this.prev.bind(this));
			slider.addEvent('click:relay(a.nivo-nextNav)', this.next.bind(this));
		}
       
		//Add Control nav
		if (this.options.controlNav) {
			var nivoControl = new Element('div.nivo-controlNav');
			slider.grab(nivoControl);
			 
			kids.each(function(child, i) {
				if (this.options.controlNavThumbs) {
					if (!child.get('tag' == 'img')) {
						child = child.getElement('img');
					}
					if (this.options.controlNavThumbsFromRel) {
						nivoControl.grab(new Element('a.nivo-control[rel='+i+']', {html:'<img src="'+ child.get('rel') + '" alt="" />'}));
					} else {
						nivoControl.grab(new Element('a.nivo-control[rel='+i+']', {html:'<img src="'+ child.get('src').replace(this.options.controlNavThumbsSearch, this.options.controlNavThumbsReplace) +'" alt="" />'}));
					}
			    } else {
					nivoControl.grab(new Element('a.nivo-control[rel='+i+']', {html: (i + 1)}));
			    }
			}, this);

			//Set initial active link
			slider.getElements('.nivo-controlNav a:nth-child('+ (this.currentSlide + 1) +')').addClass('active');
           
			slider.addEvent('click:relay(.nivo-controlNav a)', function(event, clicked) {
               this.nivoRun(document.id(clicked).get('rel'));
           }.bind(this));
		}
       
		//Keyboard Navigation
		if (this.options.keyboardNav) {
			new Keyboard({
				events: {
					left: this.prev.bind(this),
					right: this.next.bind(this)
				}
			});
       	}
       
		//For pauseOnHover setting
		if (this.options.pauseOnHover) {
			slider.addEvents({
				mouseenter: this.pause.bind(this),
				mouseleave: this.resume.bind(this)
			});
		}
		
		this.fireEvent('afterLoad');
	},
	
	start: function() {
		if (!this.options.manualAdvance && this.kids.length && !this.paused && !this.running) {
			this.timer = this.next.delay(this.options.pauseTime, this);
		}
	},
	
	pause: function() {
		clearTimeout(this.timer);
		this.paused = true;
	},
	
	resume: function() {
		this.paused = false;
		this.start();
	},
	
	next:function() {
		this.nivoRun(this.currentSlide + 1);
	},
	
	prev: function() {
		this.nivoRun(this.currentSlide - 1);
	},
	
	finished: function() {
		this.running = false;
		this.start();
		this.fireEvent('afterChange');
	},
	
	showCurrentCaption: function() {
		if (this.currentImage.get('title')) {
			var title = this.currentImage.get('title') || '';
			if (title.substr(0,1) == '#') title = document.getElement(title).get('html');	
			
			if (this.previousImage && this.previousImage.get('title')) {
				this.captionChain.chain(
					function() {
						this.captionTextTween.start('opacity', 0);
					}.bind(this),
					function() {
						this.captionText.set('html', title);
						this.captionTextTween.start('opacity', 1);
					}.bind(this)
				).callChain();		
			} else {	
				this.captionText.set('html',title);
				this.captionTween.start('opacity',this.options.captionOpacity);
			}	
		} else {
			this.captionTween.start('opacity', 0);
		}
	},

    // Private run method
	nivoRun: function(nudge) {
		if (this.running || nudge == this.currentSlide) return false;
		this.running = true;
		this.previousSlide = this.currentSlide;
		this.previousImage = this.currentImage;
		this.currentSlide = ((nudge % this.totalSlides) + this.totalSlides) % this.totalSlides;
		
		//Trigger the lastSlide callback
		if (this.currentSlide == this.totalSlides - 1) this.fireEvent('lastSlide');
		
		// Trigger the beforeChange callback
		this.fireEvent('beforeChange');
				
		// Set current background before change
		this.slider.setStyle('background','url("'+ this.previousImage.get('src') +'") no-repeat');
		
		// Trigger the slideshowEnd callback
		if (this.currentSlide == this.totalSlides - 1) {this.fireEvent('slideshowEnd');}
		
		// Set currentImage
		this.currentImage = this.kids[this.currentSlide];
		$$(this.links.clean()).setStyle('display','none');
		if (this.links[this.currentImage]) this.links[this.currentImage].setStyle('display', 'block');
		
		// Set acitve links
		if (this.options.controlNav) {
			this.slider.getElements('.nivo-controlNav a').removeClass('active');
			this.slider.getElement('.nivo-controlNav a:nth-child('+ (this.currentSlide + 1) +')').addClass('active');
		}
		
		// Process caption
		this.showCurrentCaption();
		
		// Run effect	
		this.effects[Math.floor(Math.random()*this.numEffects)].start();
	},
       
    // For debugging
    trace: function(msg) {
		if (this.console && typeof console.log != "undefined") {
			console.log(msg);
		}
	},
	
	toElement: function() {
		return this.slider;
	}

});


// Base Class for Effects
MivoSlider.Effect = new Class({

	Implements: [Options, Events, Class.Occlude],
	
	options: {},
	
	initialize: function(mivoSlider, options) {
		this.setOptions(options);
		this.mivoSlider = mivoSlider;
		this.slider = mivoSlider.toElement();
	},
	
	start: function() {
		this.finish();
	},
	
	finish: function() {
		this.mivoSlider.finished();
	}
});


MivoSlider.Effect.Sliced = new Class({

	Extends: MivoSlider.Effect,

	options: {
		timeInit: 100,
		timeBuff: 50,
		slices: 15,
		fx: {
			duration: 500
		}
	},

	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);

		this.startStyles = [];
		this.animateStyles = [];
		this.finishStyles = [];
		this.finishAllStyles = [];

		this.sliderWidth = this.slider.getStyle('width').toInt();
		this.sliceWidth = Math.round(this.sliderWidth/this.options.slices);

		this.slices = [];
		this.fx = [];
		this.delays = [];

		// Create Slices
		this.slices = this.slider.retrieve('mivo:slices', []);
		for (var i = 0; i < this.options.slices; i++) {
			if (!this.slices[i]) {
				this.slices[i] = new Element('div.nivo-slice', {
					styles: {
						left: (this.sliceWidth * i),
						width: (i != this.options.slices-1) ? this.sliceWidth : this.sliderWidth - (this.sliceWidth * i),
						'background-position': '-' + (this.sliceWidth + (i - 1) * this.sliceWidth) +'px 0%',
						'background-repeat': 'no-repeat'
					}
				});
				this.slider.grab(this.slices[i]);
			}
			this.fx[i] = new Fx.Morph(this.slices[i], 
				Object.merge(this.options.fx, {
					onComplete: this.finishSlice.pass([this.slices[i], i], this)
				}
			));
			this.delays[i] = this.calculateDelay(i);
		}

		var g = new Group(this.fx);
		g.addEvent('complete', this.finish.bind(this));
	},

	calculateDelay: function(i) {
		return this.options.timeInit + i * this.options.timeBuff;
	},

	start: function() {
		var styles = {
			height: 0,
			opacity: 0, 
			'background-image': 'url("'+ this.mivoSlider.currentImage.get('src') +'")'
		};

		this.slices.each(function(slice, i) {slice.setStyles(styles)});
		this.slices.each(this.startSlice.bind(this));
	},

	initSlice: function(slice, i) {

	},

	startSlice: function(slice, i) {
		this.slices[i].setStyles(typeOf(this.startStyles) == 'array' ? this.startStyles[i] : this.startStyles);
		this.animateSlice.delay(typeOf(this.delays) == 'array' ? this.delays[i] : this.delays, this, [slice, i]);
	},

	animateSlice: function(slice, i) {
		this.fx[i].start(typeOf(this.animateStyles) == 'array' ? this.animateStyles[i] : this.animateStyles);
	},

	finishSlice: function(slice, i) {
		this.slices[i].setStyles(typeOf(this.finishStyles) == 'array' ? this.finishStyles[i] : this.finishStyles);
	}
});




MivoSlider.Effects = {};
	
MivoSlider.Effects.sliceDown = new Class({
	Extends: MivoSlider.Effect.Sliced,
	
	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);
		this.startStyles = {top: 0, opacity: 0, height: 0};
		this.animateStyles = {height: this.slider.getStyle('height').toInt(), opacity: 1};
		this.finishStyles = {top: 'auto'};
	}
});

MivoSlider.Effects.sliceUp = new Class({
	Extends: MivoSlider.Effect.Sliced,
	
	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);		
		this.startStyles = {bottom: 0, opacity: 0, height: 0};
		this.animateStyles = {height: this.slider.getStyle('height').toInt(), opacity: 1};
		this.finishStyles = {bottom: 'auto'};
	}
});

MivoSlider.Effects.sliceUpDown = new Class({
	Extends: MivoSlider.Effect.Sliced,
	
	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);		
		this.startStyles = this.slices.map(function(slice, i) {
			var o = {opacity: 0};
			o[i % 2 == 0 ? 'top' : 'bottom'] = 0;
			return o;
		});
		this.animateStyles = {height: this.slider.getStyle('height').toInt(), opacity: 1};
		this.finishStyles = {bottom: 'auto', top: 'auto'};
	}
});

MivoSlider.Effects.fade = new Class({
	Extends: MivoSlider.Effect.Sliced,
	
	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);		
		this.delays = 0;
		this.startStyles = {opacity: 0, height: '100%'};
		this.animateStyles = {opacity: 1};
	}
});

MivoSlider.Effects.fold = new Class({
	Extends: MivoSlider.Effect.Sliced,
	
	initialize: function(mivoSlider, options) {
		this.parent(mivoSlider, options);
		this.slices.each(function(slice, i) {
			this.animateStyles[i] = {opacity: 1, width: slice.getStyle('width').toInt()};
		}, this);
		
		this.startStyles = {opacity: 0, height: '100%', width: 0};
	}
});

["sliceUp", "sliceDown", "sliceUpDown", "fold"].each(function(effect) {
	MivoSlider.Effects[effect + "Right"] = MivoSlider.Effects[effect];
	MivoSlider.Effects[effect + "Left"] = new Class ({
		Extends: MivoSlider.Effects[effect],

		initialize: function(mivoSlider, options) {
			this.parent(mivoSlider, options);		
			this.delays = this.delays.reverse();
		}		
	})	
});
		
Element.implement({
	mivoSlider: function(options) {
		return new MivoSlider(this, options);
	}	
});
