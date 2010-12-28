/*
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
		onBeforeChange: Function.from(),
		onAfterChange: Function.from(),
		onSlideshowEnd: Function.from(),
	    onLastSlide: Function.from(),
	    onAfterLoad: Function.from()		
	},
	
	initialize: function(element, options) {
		this.setOptions(options);
		if (this.occlude('mivoSlider', element)) return this.occluded;

		//Useful variables. Play carefully.
		this.vars = {
			currentSlide: 0,
			currentImage: '',
			previousImage: '',
			totalSlides: 0,
			randAnim: '',
			running: false,
			paused: false,
			stop:false
		};
   
		//Get this slider
		var slider = this.element = document.id(element);
		slider.setStyle('position','relative');
		slider.addClass('nivoSlider');
       
		//Find our slider children
		var kids = slider.getChildren();
		kids.each(function(child) {
			var link = '';
			if (!child.get('tag') == 'img') {
				if(child.get('tag') == 'a'){
					child.addClass('nivo-imageLink');
					link = child;
				}
				child = child.getElement('img');
			}
			
			//Get img width & height
			var childWidth = child.getStyle('width').toInt();
			if (childWidth == 0) childWidth = child.get('width');
			var childHeight = child.getStyle('height').toInt();
			if (childHeight == 0) childHeight = child.get('height');
			
			//Resize the slider
			if (childWidth > slider.getStyle('width').toInt()) {
				slider.setStyle('width',childWidth);
			}
			if (childHeight > slider.getStyle('height').toInt()){
				slider.setStyle(height,childHeight);
			}
			if (link != '') {
				link.setStyle('display','none');
			}
			child.setStyle('display','none');
			this.vars.totalSlides++;
		}, this);
       
		//Set startSlide
		if (this.options.startSlide > 0) {
			if (this.options.startSlide >= this.vars.totalSlides) this.options.startSlide = this.vars.totalSlides - 1;
			this.vars.currentSlide = this.options.startSlide;
		}
		
		//Get initial image
		if (kids[this.vars.currentSlide].get('tag') == 'img') {
			this.vars.currentImage = kids[this.vars.currentSlide];
		} else {
			this.vars.currentImage = kids[this.vars.currentSlide].getElement('img');
		}
		
		//Show initial link
		if (kids[this.vars.currentSlide].get('tag') == 'a') {
			kids[this.vars.currentSlide].setStyle('display','block');
		}
		
		//Set first background
		slider.setStyle('background','url("'+ this.vars.currentImage.get('src') +'") no-repeat');
       
		//Add initial slices
		for (var i = 0; i < this.options.slices; i++) {
			var sliceWidth = Math.round(slider.getStyle('width').toInt()/this.options.slices);
			if (i == this.options.slices-1) {
				slider.grab(
					new Element('div.nivo-slice',{styles:{left:(sliceWidth*i)+'px', width:(slider.getStyle('width').toInt()-(sliceWidth*i))+'px'}})
				);
			} else {
				slider.grab(
					new Element('div.nivo-slice',{styles:{ left:(sliceWidth*i)+'px', width:sliceWidth+'px'}})
				);
			}
		}
       
		//Create caption
		slider.grab(
			new Element('div.nivo-caption',{html:'<p></p>', styles: {display:'none', opacity:this.options.captionOpacity}})
		);
		 	
		//Process initial caption
		if (this.vars.currentImage.get('title') != '') {
			var title = this.vars.currentImage.get('title') || '';
			if (title.substr(0,1) == '#') title = document.id(title).get('html');
			slider.getElement('.nivo-caption p').set('html',title);	
			slider.getElement('.nivo-caption').set('tween',{duration:this.options.animSpeed}).fade('in');
		}
		
		//In the words of Super Mario "let's a go!"
		var timer = 0;
		if (!this.options.manualAdvance && kids.length > 1){
			timer = this.nivoRun.periodical(this.options.pauseTime, this, [slider, kids, this.options, false]);
		}

       //Add Direction nav
       if (this.options.directionNav) {
			slider.grab(new Element('div.nivo-directionNav',{html: '<a class="nivo-prevNav">Prev</a><a class="nivo-nextNav">Next</a></div>'}));
           
           //Hide Direction nav
			if (this.options.directionNavHide) {
				slider.getElement('.nivo-directionNav').setStyle('display','none');
				slider.addEvents({
					mouseenter: function() {
						slider.getElement('.nivo-directionNav').setStyle('display','block');
					},
					mouseleave: function() {
						slider.getElement('.nivo-directionNav').setStyle('display','none');
					}
				});
			}
           
	 
			slider.addEvent('click:relay(a.nivo-prevNav)', function() {
				if (this.vars.running) return false;
				clearInterval(timer);
				timer = '';
				this.vars.currentSlide-=2;
				this.nivoRun(slider, kids, this.options, 'prev');
			}.bind(this));
			
			slider.addEvent('click:relay(a.nivo-nextNav)', function() {
				if (this.vars.running) return false;
				clearInterval(timer);
				timer = '';
				this.nivoRun(slider, kids, this.options, 'next');
			}.bind(this));
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
			slider.getElements('.nivo-controlNav a:nth-child('+ (this.vars.currentSlide + 1) +')').addClass('active');
           
			slider.addEvent('click:relay(.nivo-controlNav a)', function(event, clicked) {
               if (this.vars.running) return false;
               if (document.id(clicked).hasClass('active')) return false;
               clearInterval(timer);
               timer = '';
               slider.setStyle('background','url("'+ this.vars.currentImage.get('src') +'") no-repeat');
               this.vars.currentSlide = document.id(clicked).get('rel') - 1;
               this.nivoRun(slider, kids, this.options, 'control');
           }.bind(this));
		}
       
		//Keyboard Navigation
		if (this.options.keyboardNav) {
			new Keyboard({
				events: {
					left: function () {
						if (this.vars.running) return false;
						clearInterval(timer);
						timer = '';
						this.vars.currentSlide-=2;
						this.nivoRun(slider, kids, settings, 'prev');
					},
					right: function() {
						if (this.vars.running) return false;
						clearInterval(timer);
						timer = '';
						this.nivoRun(slider, kids, settings, 'next');
					}
				}
			});
       	}
       
		//For pauseOnHover setting
		if (this.options.pauseOnHover) {
			slider.addEvents({
				mouseenter: function(){
					this.vars.paused = true;
					clearInterval(timer);
					timer = '';
				}.bind(this),
				mouseleave: function(){
					this.vars.paused = false;
					// Restart the timer
					if (timer == '' && !this.options.manualAdvance) {
						timer = this.nivoRun.periodical(this.options.pauseTime, this, [slider, kids, this.options, false]);
					}
				}.bind(this)
			});
		}
       
		//Event when Animation finishes
		this.addEvent('nivo:animFinished', function() { 
			this.vars.running = false;
			//Hide child links
			kids.each(function(child){
				if (child.get('tag' == 'a')) {
					child.setStyle('display','none');
				}
			});
			//Show current link
			if (kids[this.vars.currentSlide].get('tag') == 'a') {
				kids[this.vars.currentSlide].setStyle('display','block');
			}
			//Restart the timer
			if (timer == '' && !this.vars.paused && !settings.manualAdvance) {
				timer = this.nivoRun.periodical(this.options.pauseTime, this, [slider, kids, settings, false]);
			}
			//Trigger the afterChange callback
			this.fireEvent('afterChange');
		});
		
		this.fireEvent('afterLoad');
	},

    // Private run method
	nivoRun: function(slider, kids, settings, nudge) {
		//Trigger the lastSlide callback
		if (this.vars && (this.vars.currentSlide == this.vars.totalSlides - 1)){ 
			this.fireEvent('lastSlide');
		}
		   
		// Stop
		if((!this.vars || this.vars.stop) && !nudge) return false;
		
		// Trigger the beforeChange callback
		this.fireEvent('beforeChange');
				
		// Set current background before change
		if (!nudge) {
			slider.setStyle('background','url("'+ this.vars.currentImage.get('src') +'") no-repeat');
		} else {
			if (nudge == 'prev') {
				slider.setStyle('background','url("'+ this.vars.currentImage.get('src') +'") no-repeat');
			}
			if (nudge == 'next') {
				slider.setStyle('background','url("'+ this.vars.currentImage.get('src') +'") no-repeat');
			}
		}
		
		this.vars.currentSlide++;
		
		// Trigger the slideshowEnd callback
		if (this.vars.currentSlide == this.vars.totalSlides) { 
			this.vars.currentSlide = 0;
			this.fireEvent('slideshowEnd');
		}
		if(this.vars.currentSlide < 0) this.vars.currentSlide = (this.vars.totalSlides - 1);
		
		// Set vars.currentImage
		this.vars.previousImage = this.vars.currentImage;
		if (kids[this.vars.currentSlide].get('tag') == 'img') {
			this.vars.currentImage = kids[this.vars.currentSlide];
		} else {
			this.vars.currentImage = kids[this.vars.currentSlide].getElement('img');
		}
		
		// Set acitve links
		if (settings.controlNav) {
			slider.getElements('.nivo-controlNav a').removeClass('active');
			slider.getElement('.nivo-controlNav a:nth-child('+ (this.vars.currentSlide + 1) +')').addClass('active');
		}
		
		// Process caption
		// TODO: Fix opacity and make robust
		if (this.vars.currentImage.get('title')) {
			var title = this.vars.currentImage.get('title') || '';
			if (title.substr(0,1) == '#') title = document.getElement(title).get('html');	
			
			if (this.vars.previousImage && this.vars.previousImage.get('title')) {
				var caption = slider.getElement('.nivo-caption p');
				caption.set('tween', {duration:this.options.animSpeed});
				var tween = caption.get('tween');
				var comp = function() {
					caption.set('html', title);
					caption.fade('in');	
					tween.removeEvents({complete:comp});
				};
				tween.addEvent('complete', comp);
				caption.fade('out');
			} else {	
				slider.getElement('.nivo-caption p').set('html',title).setStyles({'display':'block', opacity:1});
				slider.getElement('.nivo-caption').setStyles({display:'block', opacity:0}).fade('in');
			}
			
		} else {
			slider.getElement('.nivo-caption').fade('out');
		}
		
		// Set new slice backgrounds
		slider.getElements('.nivo-slice').each(function(slice, i) {
			var sliceWidth = Math.round(slider.getStyle('width').toInt() / settings.slices);
			slice.setStyles({
				height:'0px',
				opacity:'0', 
				background: 'url("'+ this.vars.currentImage.get('src') +'") no-repeat -'+ ((sliceWidth + (i * sliceWidth)) - sliceWidth) +'px 0%' });
		}, this);
		
		if (this.options.effect == 'random'){
			var anims = ["sliceDownRight","sliceDownLeft","sliceUpRight","sliceUpLeft","sliceUpDown","sliceUpDownLeft","fold","fade"];
			this.vars.randAnim = anims[Math.floor(Math.random()*(anims.length + 1))];
			if (this.vars.randAnim == undefined) this.vars.randAnim = 'fade';
		}
		   
		// Run random effect from specified set (eg: effect:'fold,fade')
		if (settings.effect.indexOf(',') != -1) {
			var anims = settings.effect.split(',');
			vars.randAnim = anims[Math.floor(Math.random()*anims.length)];
		}
		
		// Run effects
		this.vars.running = true;
		if (this.options.effect == 'sliceDown' || this.options.effect == 'sliceDownRight' || this.vars.randAnim == 'sliceDownRight' ||
			this.options.effect == 'sliceDownLeft' || this.vars.randAnim == 'sliceDownLeft'){
			var timeBuff = 0;
			var i = 0;
			var slices = slider.getElements('.nivo-slice');
			var height = slider.getStyle('height').toInt();
			if (this.options.effect == 'sliceDownLeft' || this.options.randAnim == 'sliceDownLeft') slices = slices.reverse();
			slices.each(function(slice, i) {
				slice.setStyle('top','0px');
				slice.set('morph', {duration: this.options.animSpeed});
				if (i == this.options.slices-1) {	
					slice.get('morph').addEvent('complete', function() {this.fireEvent('nivo:animFinished')}.bind(this));
				}
				setTimeout(function() {
					slice.morph({ height:height, opacity:'1.0'});
				}, (100 + timeBuff));
				timeBuff += 50;
			}, this);
		} 
		else if (this.options.effect == 'sliceUp' || this.options.effect == 'sliceUpRight' || this.vars.randAnim == 'sliceUpRight' ||
				this.options.effect == 'sliceUpLeft' || this.vars.randAnim == 'sliceUpLeft'){
			var timeBuff = 0;
			var i = 0;
			var slices = slider.getElements('.nivo-slice');
			var height = slider.getStyle('height').toInt();
			if (this.options.effect == 'sliceUpLeft' || this.vars.randAnim == 'sliceUpLeft') slices = slices.reverse();
			slices.each(function(slice, i) {
				slice.setStyle('bottom', '0px');
				slice.set('morph', {duration: this.options.animSpeed});
				if (i == this.options.slices-1) {	
					slice.get('morph').addEvent('complete', function() {this.fireEvent('nivo:animFinished')}.bind(this));
				}
				setTimeout(function() {
					slice.morph({ height:height, opacity:'1.0'});
				}, (100 + timeBuff));
				timeBuff += 50;
			}, this);
		}
		else if (this.options.effect == 'sliceUpDown' || this.options.effect == 'sliceUpDownRight' || this.vars.randAnim == 'sliceUpDown' || 
				this.options.effect == 'sliceUpDownLeft' || this.vars.randAnim == 'sliceUpDownLeft'){
			var timeBuff = 0;
			var slices = slider.getElements('.nivo-slice');
			var height = slider.getStyle('height').toInt();
			if (this.options.effect == 'sliceUpDownLeft' || this.vars.randAnim == 'sliceUpDownLeft') slices = slices.reverse();
			slices.each(function(slice, i) {
				if (i % 2 == 0) {
					slice.setStyle('top','0px');
				} else {
					slice.setStyle('bottom','0px');
				}
				slice.set('morph', {duration: this.options.animSpeed});
				if (i == settings.slices - 1) {
					slice.get('morph').addEvent('complete', function() {this.fireEvent('nivo:animFinished')}.bind(this));
				}
				setTimeout(function() {
					slice.morph({height:height, opacity:'1.0'});
				}, (100 + timeBuff));
				timeBuff += 50;
			}, this);
		} 
		else if (this.options.effect == 'fold' || this.vars.randAnim == 'fold') {
			var timeBuff = 0;
			var slices = slider.getElements('.nivo-slice');
			slices.each(function(slice, i) {
				var origWidth = slice.getStyle('width').toInt();
				slice.setStyles({top:'0px', height:'100%', width:'0px'});
				slice.set('morph', {duration: this.options.animSpeed});
				if (i == settings.slices - 1) {
					slice.get('morph').addEvent('complete', function() {this.fireEvent('nivo:animFinished')}.bind(this));
				}
				setTimeout(function(){
					slice.morph({ width:origWidth, opacity:'1.0'});
				}, (100 + timeBuff));
				timeBuff += 50;
			}, this);
		}  
		else if (this.options.effect == 'fade' || this.vars.randAnim == 'fade'){
			var slices = slider.getElements('.nivo-slice');
			slices.each(function(slice, i) {
				slice.setStyle('height','100%');
				slice.set('morph', {duration: this.options.animSpeed*2});
				if (i == settings.slices - 1) {
					slice.get('morph').addEvent('complete', function() {this.fireEvent('nivo:animFinished')}.bind(this));
				}
				slice.morph({opacity:'1.0'});
			}, this);
		}
	},
       
    // For debugging
    trace: function(msg) {
		if (this.console && typeof console.log != "undefined") {
			console.log(msg);
		}
	},
	
	stop: function() {
		this.vars.stop = true;
		this.trace('Stop Slider');
	},
	
	start: function() {
		this.vars.stop = false;
		this.trace('Start Slider');
	}

});

Element.implement({
	mivoSlider: function(options) {
		return new MivoSlider(this, options);
	}	
});
