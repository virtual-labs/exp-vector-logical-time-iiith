"use strict";

export function isElement(element) {
    return element instanceof Element || element instanceof Document;  
}

export function getPosition(el) {
    var xPosition = 0;
    var yPosition = 0;
   
    while (el) {
        if (el == document.body) {

          var xScrollPos = el.scrollLeft || document.documentElement.scrollLeft;
          var yScrollPos = el.scrollTop || document.documentElement.scrollTop;
    
          xPosition += (el.offsetLeft - xScrollPos + el.clientLeft);
          yPosition += (el.offsetTop - yScrollPos + el.clientTop);
        } 
        else {
          xPosition += (el.offsetLeft - el.scrollLeft + el.clientLeft);
          yPosition += (el.offsetTop - el.scrollTop + el.clientTop);
        }
    
        el = el.offsetParent;
    }
    return {
      x: xPosition,
      y: yPosition
    };
}

export function getRelativePosition(el, par) {
    var xPosition = 0;
    var yPosition = 0;
    while (!(el === par)) {
        if (el == document.body) {

            var xScrollPos = el.scrollLeft || document.documentElement.scrollLeft;
            var yScrollPos = el.scrollTop || document.documentElement.scrollTop;
       
            xPosition += (el.offsetLeft - xScrollPos + el.clientLeft);
            yPosition += (el.offsetTop - yScrollPos + el.clientTop);
          } 
          else {
            xPosition += (el.offsetLeft - el.scrollLeft + el.clientLeft);
            yPosition += (el.offsetTop - el.scrollTop + el.clientTop);
          }
       
          el = el.offsetParent;
    }
    return {
        x: xPosition,
        y: yPosition
      };
}

export function rotateLine(l1, pc, angle) {
    return {
        p1: rotatePoint(l1.p1, pc, angle),
        p2: rotatePoint(l1.p2, pc, angle)
    };
}

export function lineParallel(l1, ps, distance) {
    const slope = Math.atan2((l1.p2.y - l1.p1.y) , (l1.p2.x - l1.p1.x));
    return {
        p1: ps,
        p2: {
            x: ps.x + distance * Math.cos(slope),
            y: ps.y + distance * Math.sin(slope)
        }
    };
}

function rotatePoint(p1, pc, angle) {
    const degangle = Math.PI / 180 * angle;
    return {
      x: (p1.x - pc.x) * Math.cos(degangle) - (p1.y - pc.y) * Math.sin(degangle) + pc.x,
      y: (p1.x - pc.x) * Math.sin(degangle) + (p1.y - pc.y) * Math.cos(degangle) + pc.y
    };
}

export function setInputFilter(textbox, inputFilter) {
    textbox.addEventListener("input", (event) => {
        if(event.data !== null) {
            if(!textbox.hasOwnProperty("oldValue")) {
                textbox.oldValue = "";
            }
            const new_val = textbox.oldValue + event.data; 
            if(inputFilter(new_val)) {
                textbox.oldValue = new_val;
            }
            else if (textbox.hasOwnProperty("oldValue")) {
                textbox.value = textbox.oldValue;
            }
        }
    });
}

export class Semaphore {
  
    constructor(max) {
        this.counter = 0;
        this.max = max;
        this.waiting = [];    
    }
    
    take ()
    {
        if (this.waiting.length > 0 && this.counter < this.max) {
            this.counter++;
            let promise = waiting.shift();
            promise.resolve();
        }
    }
    
    acquire () {
        if(this.counter < this.max) {
            this.counter++;
            return new Promise(resolve => {
                resolve();
            });
        } 
        else {
            return new Promise((resolve, err) => {
                this.waiting.push({resolve: resolve, err: err});
            });
        }
    }
      
    release () {
        this.counter--;
        this.take();
    }
    
    purge () {
        let unresolved = waiting.length;
    
        for (let i = 0; i < unresolved; i++) {
            waiting[i].err('Purging uncompleted tasks');
        }

        counter = 0;
        waiting = [];
      
        return unresolved;
    }
}