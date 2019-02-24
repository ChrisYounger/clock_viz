
define([
    'jquery',
    'moment',
    'moment-timezone',
    'api/SplunkVisualizationBase',
    'api/SplunkVisualizationUtils'
],
function(
    $,
    moment,
    momenttz,
    SplunkVisualizationBase,
    vizUtils
) {
    // Snapsvg version 5 has a bug with the rotation. 
    // https://github.com/adobe-webplatform/Snap.svg/issues/603
    // Also it doesn't work with webpack noramlly so it is loaded with this hack:
    // https://github.com/adobe-webplatform/Snap.svg/issues/341
    var Snap = require( "imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js" );

    function Clock(elem, options) {
        "use strict";

        // Setup clock face
        this.s = new Snap(elem);
        
        // Set defaults
        this.showSeconds = true;
        this.offset = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;

        if ("movement" in options && options.movement === "bounce") {
            this.easing = mina.bounce;
            this.duration = 400;
        } else if ("movement" in options && options.movement === "smooth") {
            this.easing = mina.linear;
            this.duration = 1000;
        } else { // tick
            this.easing = mina.linear;
            this.duration = 100;
        }
                
        if ("showSeconds" in options) {
            this.showSeconds = options.showSeconds;
        }
        if ("timezone" in options) {
            this.timezone = options.timezone;
        }
        if ("numerals" in options) {
            this.numerals = options.numerals;
        }
        this.updateTime();
        // Set up clock
        this.drawClockFace();
    }

    Clock.prototype.drawClockFace = function () {
        var clockFace = this.s.circle(150, 150, 100);
        clockFace.attr({
            fill: "#FFF",
            stroke: "#000",
            strokeWidth: 4
        });

        // Draw ticks
        for (var x = 1; x <= 12; x++) {
            if (this.numerals) {
                var hourStroke = this.s.text(150, 70, x);
                var hourStroke2 = this.s.line(150, 80, 150, 80);
                hourStroke.attr({
                    stroke: "#000",
                    dominantBaseline: "middle",
                    textAnchor:"middle"
                });
                hourStroke2.attr({
                    stroke: "#000",
                    strokeWidth: 4,
                    "stroke-linecap": "round"
                });            
                var t = new Snap.Matrix();
                t.rotate((360 / 12) * x, 150, 150);
                hourStroke.transform(t);
                hourStroke2.transform(t);   
            } else {
                var hourStroke = this.s.line(150, 60, 150, 80);
                hourStroke.attr({
                    stroke: "#000",
                    dominantBaseline: "middle",
                    textAnchor:"middle"
                });          
                var t = new Snap.Matrix();
                t.rotate((360 / 12) * x, 150, 150);
                hourStroke.transform(t);
            }
        }

        this.hourHand = this.s.line(150, 150, 150, 110);
        this.hourHand.attr({
            stroke: "#000",
            strokeWidth: 4
        });

        this.minuteHand = this.s.line(150, 150, 150, 60);
        this.minuteHand.attr({
            stroke: "#000",
            strokeWidth: 3
        });

        if (this.showSeconds) {
            this.secondHand = this.s.line(150, 150, 150, 60);
            this.secondHand.attr({
                stroke: "#FF0000",
                strokeWidth: 1
            });
        }

        // Centre point
        var clockCenter = this.s.circle(150, 150, 6);
        clockCenter.attr({
            fill: "#000"
        });

        // Set initial location of hands
        if (this.showSeconds) {
            this.secondHandPos = this.second;
            var s = new Snap.Matrix();
            s.rotate(this.secondHandPos, 150, 150);
            this.secondHand.transform(s);
        }

        this.hourHandPos = this.hour;
        var h = new Snap.Matrix();
        h.rotate(this.hourHandPos, 150, 150);
        this.hourHand.transform(h);

        this.minuteHandPos = this.minute;
        var m = new Snap.Matrix();
        m.rotate(this.minuteHandPos, 150, 150);
        this.minuteHand.transform(m);
    };

    Clock.prototype.updateTime = function () {
        var now = moment();
        if (this.timezone){
            now.tz(this.timezone);
        }
        this.second =  (360 / 60) * now.second();
        this.minute = (360 / 60) * now.minute();
        var increment = Math.round((30 / 60) * now.minute());
        this.hour = ((360 / 12) * now.hour()) + increment;        
    };

    Clock.prototype.animateHands = function () {
        this.updateTime();
        var move_from;
        // Move second hand
        if (this.showSeconds) {
            move_from = this.secondHandPos;
            this.animateHand(this.secondHand, move_from, this.second);
            this.secondHandPos = this.second;
        }

        // Move minute hand
        move_from = this.minuteHandPos;
        this.animateHand(this.minuteHand, move_from, this.minute);
        this.minuteHandPos = this.minute;

        // Move hour hand
        move_from = this.hourHandPos;
        this.animateHand(this.hourHand, move_from, this.hour);
        this.hourHandPos = this.hour;
    };

    Clock.prototype.animateHand = function (hand, move_from, move_to) {
        if (move_from !== move_to) {
            // Hack here otherwise the hand seems to take the long way around...
            if (move_to === 0) {
                move_to = 360;
            }
            hand.stop().transform('r' + move_from + ',150,150').animate({ transform: 'r' + move_to + ',150,150' }, this.duration, this.easing);
        }
    };

    Clock.prototype.startClock = function () {
        // Update clock every second
        var instance = this;
        this.timeoutId = setInterval(function () {
            instance.animateHands();
        }, 1000);
    };

    Clock.prototype.stopClock = function () {
        clearTimeout(this.timeoutId);
    };


    return SplunkVisualizationBase.extend({
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$container_wrap = $(this.el);
            this.$container_wrap.addClass('clock_viz-wrap-parent');
            this.$container = $("<div class='clock_viz-wrap'></div>").appendTo(this.$container_wrap);
            if (vizUtils.getCurrentTheme() === 'dark') {
                this.$container_wrap.addClass('clock_viz-darkmodez');
            }
            this.clockId = Math.round(Math.random() * 1000000);
        },

        remove: function(){
            this.stopTimers();
        },

        stopTimers: function(){
            var clk = this;
            if (clk.hasOwnProperty("clock")) {
                clk.clock.stopClock();
            }
            if (clk.hasOwnProperty('interval')){
                clearInterval(clk.interval);
            }
            if (clk.hasOwnProperty('intervaldate')){
                clearInterval(clk.intervaldate);
            }            
        },

        formatData: function(data) {
            return data;
        },

        updateView: function(data, config) {
            var clk = this;
            this.stopTimers();
            clk.config = {
                style: "d",
                timezone: "",
                subtext: "",
                size: "",
                caption: "",
                captsize: "0.3",
                showdate: "false",
                datesize: "0.2",
                seconds: "bounce",
                numerals: "false",
                format: "h:mm:ss a",
                font: "bold",
                datefmt: "Do MMMM YYYY"
            }; 
            for (var opt in config) {
                if (config.hasOwnProperty(opt)) {
                    clk.config[ opt.replace(clk.getPropertyNamespaceInfo().propertyNamespace,'') ] = config[opt];
                }
            }
            clk.config.formatp = null;         
            clk.$container.empty();
            clk.$container.removeClass("clock_viz-wrap-a clock_viz-wrap-d")
            clk.$container.addClass("clock_viz-wrap-" + clk.config.style)
            // Digital clock setup
            if (clk.config.style === "d") {
                clk.$elem = $("<div class='clock_viz-digitalwrap'></div>");
                if (clk.config.font === "orbitron") {
                    clk.$elem.css({"font-family": "Orbitron, sans-serif", "font-weight" : 700});
                } else if (clk.config.font === "aldrich") {
                    clk.$elem.css("font-family", "Aldrich, sans-serif");
                } else if (clk.config.font !== "normal") {
                    clk.$elem.css("font-weight", "bold");
                }
                clk.$elem.appendTo(clk.$container);                
                clk.config.parts = [];
                clk.config.prev = [];
				clk.config.formatp = clk.config.format.replace(/(MMMM|MMM|MM|Mo|DDDD|DDDo|DDD|DD|Do|dddd|ddd|dd|do|WW|Wo|wo|ww|YYYY|YY|gggg|gg|GGGG|GG|HH|hh|mm|SSS|SS|ss|ZZ|zz|.)/g, function(a,p,o) {
                    var all = a;
                    if (all === ":") all = "colon";
					if (all === " ") all = "space";
					if (/\W/.test(all)) all = "misc";	
					clk.config.parts.push( $("<span class='clock_viz-part-" + all + "'></span>").appendTo(clk.$elem) );
                    clk.config.prev.push(undefined);
					return a + "|";
				});

                if (clk.config.showdate === "true") {
                    clk.$date = $("<div class='clock_viz-dateoverlay'></div>").appendTo(clk.$container);
                    clk.datePrev = "";
                }
                
                if (clk.config.caption !== "") {
                    clk.$caption = $("<div class='clock_viz-caption'></div>").text(clk.config.caption).appendTo(clk.$container);
                }

                if (clk.config.size > 0) {
                    clk.setSize(clk.config.size);
                } else {
                    clk.reflow();
                }

                clk.updateDigitalParts();
                clk.interval = setInterval(function(){
                    clk.updateDigitalParts();
                }, 1000);
                

            // analog clock
            } else if (clk.config.style === "a") {
                if (clk.config.size > 0) {
                    clk.$elem = $("<svg width='" + clk.config.size + "' height='" + clk.config.size + "' viewBox='0 0 300 300'>").appendTo(clk.$container);
                } else {
                    clk.$elem = $("<svg width='100' height='100' viewBox='0 0 300 300'>").appendTo(clk.$container);
                }
                var opt = {};
                if (clk.config.seconds  === "hidden") {
                    opt.showSeconds = false;
                } else {
                    opt.showSeconds = true;
                    if (clk.config.seconds  === "smooth"){
                        opt.movement = "smooth";
                    } else if (clk.config.seconds  === "tick") {
                        opt.movement = "tick";
                    } else {
                        opt.movement = "bounce";
                    }
                }
                opt.timezone = clk.config.timezone;
                opt.numerals = (clk.config.numerals === "true");

                if (clk.config.showdate === "true") {
                    clk.$date = $("<div class='clock_viz-dateoverlay'></div>").appendTo(clk.$container);
                    clk.datePrev = "";
                    clk.updateDigitalParts();
                    clk.interval = setInterval(function(){
                        clk.updateDigitalParts();
                    }, 1000);                  
                }

                if (clk.config.caption !== "") {
                    clk.$caption = $("<div class='clock_viz-caption'></div>").text(clk.config.caption).appendTo(clk.$container);
                }
                
                clk.clock = new Clock(clk.$elem[0], opt);
                clk.clock.startClock();

                if (clk.config.size > 0) {
                    clk.setSize(clk.config.size);
                } else {
                    clk.reflow();
                }
            } else {
                $("<div>Unknown clock type</div>").appendTo(clk.$container);
            }
        },

        updateDigitalParts: function() {
            var clk = this;
            var now;
            if (clk.config.timezone) {
                now = moment().tz(clk.config.timezone);
            } else {
                now = moment();
            }
            // This function also updates the "date" component even when using the analog clock
            // formatp only exists for digital clock
            if (clk.config.formatp !== null) {  
                // Update clock
                var parts = now.format(clk.config.formatp).split("|");
                // always need to shift off the final element as it will be empty
                parts.pop();
                // check that parts arrays match in length
                if (parts.length !== clk.config.parts.length) {
                    console.log("clock widget error: mismatch in array lengths!", parts, clk.config.parts);
                }
                for (var i = 0; i < parts.length; i++) {
                    if (clk.config.prev[i] !== parts[i]) {
                        clk.config.prev[i] = parts[i];
                        clk.config.parts[i].text(parts[i]);
                    }
                }
            }
            // If there is a date component
            if (clk.config.showdate === "true") {
                var datePart = now.format(clk.config.datefmt);
                if (clk.datePrev !== datePart) {
                    clk.datePrev = datePart;
                    clk.$date.text(clk.datePrev);
                }
            }
        },

        // Override to respond to re-sizing events
        reflow: function() {
            var clk = this;
            //console.log("reflow size ", clk.config["size"]);
            if (!(clk.config.size > 0)) {
                var newSize = Math.min(clk.$container_wrap.height(), clk.$container_wrap.width());
                if (clk.config.style === "d") {
                    // for the digital clock we assume its typically 4 times wider than it is high
                    // A better way would be the check the ratio'd size of the clock
                    newSize = Math.min(clk.$container_wrap.height(), (clk.$container_wrap.width() / 4));
                }
                //console.log("reflow to ", clk.$container_wrap.height(), clk.$container_wrap.width(), newSize);
                clk.setSize(newSize);
            }
        },

        setSize: function(newContSize){
            var clk = this;
            newContSize = parseFloat(newContSize);
            if (clk.config.style === "d") {
                // console.log("Size is ", newSize);
                // console.log("datesize is ", parseFloat(clk.config["datesize"]));
                // console.log("captsize is ", parseFloat(clk.config["captsize"]));
                //  might need to deal with the fact these rows are optional
                newSize = newContSize / (parseFloat(clk.config.datesize) * 1.14 + parseFloat(clk.config.captsize) * 1.14 + 1.14);
                //console.log("Size is now ", newSize);
                clk.$elem.css({
                    "font-size": newSize,
                });
                if (clk.$date) {
                    clk.$date.css({
                        "font-size": (newSize * parseFloat(clk.config.datesize)) + "px"
                    });
                }
                if (clk.$caption){
                    clk.$caption.css({
                        "font-size": (newSize * parseFloat(clk.config.captsize)) + "px"
                    });
                }
            }
            if (clk.config.style === "a") {
                clk.$elem.attr("height", newContSize).attr("width", newContSize);
                if (clk.$date) {
                    clk.$date.css({
                        "line-height": (newContSize * 1.15) + "px", 
                        "font-size": (newContSize * 0.2 * parseFloat(clk.config.datesize)) + "px"
                    });
                }
                if (clk.$caption){
                    clk.$caption.css({
                        "line-height": (newContSize * 0.16) + "px", 
                        "font-size": (newContSize * 0.2 * parseFloat(clk.config.captsize)) + "px"
                    });
                }
            }
            // vertically center elements
            clk.$container.css({'height': newContSize + 'px'});
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.COLUMN_MAJOR_OUTPUT_MODE,
                count: 10000
            });
        }
    });
});