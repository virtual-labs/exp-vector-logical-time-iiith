"use strict";

import { computeVector, createEvent, createMessage } from "./simulation.js";
import { isElement, getPosition, getRelativePosition, rotateLine, lineParallel, setInputFilter, Semaphore } from "./helper.js";
import { generateTest } from "./generate.js";

const tellspace = document.getElementById("tellspace");
// Area of work

const simspace = document.getElementById("simspace");
let simpos = null;
// Used to store containers

const messagespace = document.getElementById("messagespace");
// Used to draw lines between events

const cyclespace = document.getElementById("cyclespace");
// Used for popup to ell used that a cycle has been found

const causalgroup = document.getElementById("causalgroup");
// Used for displaying causal link of events

const causalspace = document.getElementById("causalspace");
// SVG element on which causal chains are drawn

const displayspace = document.getElementById("displayspace");
// Container for SVG

const pinboard = document.getElementById("pinboard");
// Background

const modechange = document.getElementById("mode");
// Changing modes

const checkanswerswrap = document.getElementById("wrapper");
// Wraps around button for display purposes

const displaywrap = document.getElementById("wrapper2");
// Wraps around displayspace

const nodes = [];
// An array of all nodes in the distributed system

const events = [];
// Array of all events

const wrappers = [checkanswerswrap, displaywrap];
// Wrapping divisions

const generator_params = document.getElementsByClassName("aparam");
// Parameters for generating

const generatebutton = document.getElementById("ordergenerate");
// Generate 

let mode = 0;
/* Modes - 0 - Simulate
         - 1 - Test
*/

let test_progress = 0;
/* Progress -                       Process             Events              Messages
                                Min         Max     Min         Max     Min         Max
                0 - Easy        3           5       7           14      4           10
                1 - Medium      5           7       14          21      8           20
                2 - Hard        7           99      17          99      16          99
*/

let test_state = 0;
// Test states - 0 - nothing has been done (newly entered generate mode) - 1 - generate has been clicked - 2 - check my answers clicked

const DIFFICULTY = {
    EASY: {
        PRO: {
            MIN: 3,
            MAX: 5
        },
        EVE: {
            MIN: 7,
            MAX: 14
        },
        MES: {
            MIN: 4,
            MAX: 10
        }
    },
    MEDIUM: {
        PRO: {
            MIN: 5,
            MAX: 7
        },
        EVE: {
            MIN: 14,
            MAX: 21
        },
        MES: {
            MIN: 8,
            MAX: 20
        }
    },
    HARD: {
        PRO: {
            MIN: 7,
            MAX: 99
        },
        EVE: {
            MIN: 17,
            MAX: 99
        },
        MES: {
            MIN: 16,
            MAX: 99
        }
    }
}

Object.freeze(DIFFICULTY);
// Treat as enum

const check_answers = document.getElementById("check");
// Check answers

const speed = document.getElementById("speed");
// Current difficulty indicator

const needle = speed.querySelector("div.needle");
// Selecting needle

let max_events_offset = 0;
// Local Co-ordinates in simspace  of the rightmost event

const messages = [];
// Array of all messages

let addEventsMessage = true;
// Used with buttons in eventadd div to see whether events and messages should be added or deleted

let ticking = false;
// Used to throttle events

let messagestate = 0;
let currentMessage = null;
let fromMessage = null;
let fromEvent = null;
let fromEventobj = null;
// Used for creating message

const shapeOffset = 7.5;
// Related to size of event marker

const addMode = document.getElementById("add"); 
const subMode = document.getElementById("subtract");
// Buttons for changing between adding and subtracting events

const event_time = new Map();
// Event time mappings

const ticks = [];
// Array having ticking for each process

const causal_chain = new Map();
// Map establishing causal links between elements

let current_display_p = -1;
let current_display_t = -1;

const inmin = 1;
const inmax = 5;
const indefault = 1;
// Ticking of processes, min, max

let current_max_z = 0;
// Helps move selected event tips to the front

let gen_tick = false;
// Ticking for generator button

// Function is used to determine whether the current width can hold all events. Empirically determined
function mysteryAdjustment(curwidth, vw, max_events_offset) {
    return curwidth - 13 - 10 * vw >= max_events_offset;
}

// Function is used to adjust time
function manageTime(commanded = false, commandedpos = 100) {
    if (!ticking) {
        const scrollwidth = tellspace.scrollWidth;
        const clientwidth = tellspace.clientWidth;
        // Getting real width and displayed width in pixels

        const vw = Math.min(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) / 100, 10);

        const curwidth    = parseFloat(simspace.style.width.slice(0, -2));
        // Getting current width
        if(commanded) {
            ticking = true;
            const a_observ = new ResizeObserver((entries) => {
                for (const e of entries) {
                    if(Math.floor(parseFloat(e.target.style.width.slice(0, -2))) === Math.floor(commandedpos)) {
                        a_observ.unobserve(e.target);
                        // Resize has achieved the correct width
                    }
                    else {
                        e.target.style.width = String(commandedpos) + 'px';
                        // Resize failed. Try again
                    }
                }
            });
            window.requestAnimationFrame((time) => {
                tellspace.scrollTo(20, 0);
                a_observ.observe(simspace);
                // Observe resizes
                simspace.style.width = String(commandedpos) + 'px';
                ticking = false;
            });
        }
        else {
            window.requestAnimationFrame(function() {
                // If a scrollbar is required
                if(scrollwidth > clientwidth) {
                    if(scrollwidth - clientwidth <= tellspace.scrollLeft + 1) {
                        // If the scrollbar is at max right, add some more space
                        tellspace.scrollTo(scrollwidth - clientwidth - 4, 0);
                        simspace.style.width = String(curwidth + 5) + 'px';
                    }
                    else if (tellspace.scrollLeft <= 1 && curwidth - 5 >= clientwidth && mysteryAdjustment(curwidth, vw, max_events_offset)) {
                        // If the scrollbar is at max left delete some space
                        // Don't let the space get too small or shrink beyond an event
                        tellspace.scrollTo(4, 0);
                        simspace.style.width = String(curwidth - 5) + 'px';
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }
}

// Function for updating times associated with each element
function updateEventTimes(testing = false) {
    const cycleDetect = computeVector(events, messages, ticks, event_time, causal_chain);
    if(!cycleDetect) {
        let i = events.length - 1;
        current_max_z = events.length;
        while(i >= 0) {
            const ID_FORMAT = events[i].p.toString() + '-' + events[i].t.toString() + '-tip';
            // Format of event tool tip
            const eventtip = document.getElementById(ID_FORMAT);
            // Getting tip corresponding to event
            if(!(eventtip === null)) {
                while(eventtip.firstChild) {
                    eventtip.removeChild(eventtip.lastChild);
                }
                // Remove all previous text
                const toadd = document.createTextNode('e');
                const toadd8 = document.createElement("span");
                const toadd2 = document.createElement("sub");
                const toadd3 = document.createTextNode(events[i].id.toString());
                const toadd5 = document.createElement("sup");
                const toadd6 = document.createTextNode("T");
                toadd5.appendChild(toadd6);
                let toadd4 = null;
                if(testing) {
                    const ided = "enquirer-" + String(i);
                    const toadd14 = document.createElement("label");
                    toadd14.classList.add("lbu");
                    toadd14.htmlFor = ided;
                    const toadd15 = document.createTextNode(":[");
                    toadd14.appendChild(toadd15);
                    const toadd16 = document.createElement("input");
                    toadd16.type = "text";
                    toadd16.value = "";
                    toadd16.classList.add("enquirer");
                    toadd16.id = ided;
                    setInputFilter(toadd16, function(value) {
                        const test_val = /^[ ]*\d+[ ]*(,[ ]*\d+[ ]*)*,?[ ]*\d*[ ]*$/.test(value)
                        || value === "";
                        if(!ticking && test_val) {
                            window.requestAnimationFrame(() => {
                                toadd16.setAttribute("size", value.length);
                                const dims = eventtip.getBoundingClientRect();
                                const dims2 = eventtip.parentNode.getBoundingClientRect();
                                eventtip.style.left = String(- dims.width / 2 + dims2.width / 3) + 'px';
                                ticking = false;
                            });
                            ticking = true;
                        }
                        return test_val;
                    });
                    toadd16.addEventListener("focus", (event) => {
                        toadd16.setAttribute("size", 
                            (toadd16.value.length === 0) ? 1 : toadd16.value.length);
                        const dims = eventtip.getBoundingClientRect();
                        const dims2 = eventtip.parentNode.getBoundingClientRect();
                        eventtip.style.left = String(- dims.width / 2 + dims2.width / 3) + 'px';
                        ticking = false;
                    });
                    toadd16.addEventListener("blur", (event) => {
                        toadd16.setAttribute("size", null);
                        const dims = eventtip.getBoundingClientRect();
                        const dims2 = eventtip.parentNode.getBoundingClientRect();
                        eventtip.style.left = String(- dims.width / 2 + dims2.width / 3) + 'px';
                    });
                    const toadd17 = document.createElement("label");
                    toadd17.classList.add("rbu");
                    toadd17.htmlFor = ided;
                    const toadd18 = document.createTextNode("]");
                    toadd17.appendChild(toadd18);
                    const toadd19 = document.createElement("sup");
                    const toadd20 = document.createTextNode("T");
                    toadd19.appendChild(toadd20);
                    const toadd12 = document.createElement("div");
                    toadd12.classList.add("flipper");
                    const toadd7 = document.createElement("span");
                    toadd7.classList.add("answerer");
                    const toadd21 = document.createElement("span");
                    const toadd22 = document.createTextNode('[');
                    toadd21.appendChild(toadd22);
                    const toadd10 = document.createTextNode(event_time.get(events[i]).toString());
                    toadd7.appendChild(toadd10);
                    const toadd23 = document.createElement("span");
                    const toadd24 = document.createTextNode(']');
                    toadd23.appendChild(toadd24);
                    const toadd11 = document.createElement("span");
                    toadd11.classList.add("separator");
                    const toadd8 = document.createTextNode('|');
                    toadd11.appendChild(toadd8);
                    toadd12.appendChild(toadd11);
                    toadd12.appendChild(toadd21);
                    toadd12.appendChild(toadd7);
                    toadd12.appendChild(toadd23);
                    toadd12.appendChild(toadd5);

                    toadd4 = document.createElement("div");
                    toadd4.appendChild(toadd14);
                    toadd4.appendChild(toadd16);
                    toadd4.appendChild(toadd17);
                    toadd4.appendChild(toadd19);
                    toadd4.appendChild(toadd12);
                }
                else {
                    const toadd10 = document.createTextNode(': [' + event_time.get(events[i]).toString() + ']');
                    toadd4 = document.createElement("span");
                    toadd4.appendChild(toadd10);
                    toadd4.appendChild(toadd5);
                }
                

                toadd2.appendChild(toadd3);
                toadd8.appendChild(toadd);
                toadd8.appendChild(toadd2);
                eventtip.appendChild(toadd8);
                eventtip.appendChild(toadd4);
                eventtip.parentNode.style.zIndex = String(4 + events.length - i);
                eventtip.addEventListener("click", (event) => {
                    event.stopPropagation();
                    if(!ticking) {
                        window.requestAnimationFrame((event) => {
                            current_max_z++;
                            eventtip.parentNode.style.zIndex = String(current_max_z);
                            ticking = false;
                        });
                        ticking = true;
                    }
                }, true);
                // Adding new time
                const dims = eventtip.getBoundingClientRect();
                const dims2 = eventtip.parentNode.getBoundingClientRect();
                eventtip.style.left = String(- dims.width / 2 + dims2.width / 3) + 'px';
            }
            i--;
        }
        // Modifying DOM which might be observable - request timeout from other events       
    }
    return cycleDetect;
}

// Helper function for drawing lines with arrows in displayspace
function createArrowLine (event1, event2, startx, starty, gridx, gridy, used_processes, radius) {
    const event1x = startx + (event_time.get(event1)[event1.p] - 1) * gridx;
    const event1y = starty + used_processes.get(event1.p) * gridy;
    const event2x = startx + (event_time.get(event2)[event2.p] - 1) * gridx;
    const event2y = starty + used_processes.get(event2.p) * gridy;
    const toadd = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // Graphics group for arrow
    const p1 = {
        x: event1x,
        y: event1y
    };
    const p2 = {
        x: event2x,
        y: event2y
    };
    const l1 = {
        p1: p1,
        p2: p2
    };
    const l6 = lineParallel(l1, p1, radius);
    const l7 = lineParallel(l1, p2, -radius-20);
    const toadd2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    toadd2.setAttributeNS(null, "x1", l6.p2.x);
    toadd2.setAttributeNS(null, "y1", l6.p2.y);
    toadd2.setAttributeNS(null, "x2", l7.p2.x);
    toadd2.setAttributeNS(null, "y2", l7.p2.y);
    // Drawing line from event1 to event2
    const l2 = lineParallel(l1, l7.p2, 10);
    const l3 = rotateLine(l2, l7.p2, 270);
    const l4 = rotateLine(l2, l7.p2, -270);
    const l5 = lineParallel(l1, l7.p2, 20);
    const point_to_string = function(p1) {
        return p1.x.toString() + ',' + p1.y.toString();
    }
    const toadd3 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    toadd3.setAttributeNS(
        null, "points", 
        point_to_string(l3.p2) + ' ' +
        point_to_string(l4.p2) + ' ' +
        point_to_string(l5.p2)
    );
    toadd.appendChild(toadd2);
    toadd.appendChild(toadd3);
    return toadd;
}

//Function for drawing causal tree
function displayCausalGraph(process = -1, time = -1) {
    while(causalgroup.firstChild) {
        causalgroup.removeChild(causalgroup.lastChild);
        // Clearing causal display
    }
    
    if(process >= 0 && time >= 0) {
        let i = events.length;
        let start_event = null;
        const lastStack = [];
        // Used as a stack to get events with lower times first
        const processQ = [];
        // Used to build up graph with a queue
        const used_processes = new Map();
        // Processes that are in the history of this event
        while(i-- > 0) {
            if(
                events[i].t === time &&
                events[i].p === process
            ) {
                start_event = events[i];
            }
        }
        if(!(start_event === null)) {
            processQ.push(start_event);
            // Pushing starting event into queue
            while(processQ.length > 0) {

                start_event = processQ.shift();
                if(causal_chain.has(start_event)) {
                    lastStack.push(start_event);
                    if(!used_processes.has(start_event.p)) {
                        used_processes.set(start_event.p, used_processes.size);
                    }
                    start_event = causal_chain.get(start_event);
                    if (start_event === null) {
                        // Root event

                    }
                    else if(start_event instanceof Array) {
                        // Multiple parents for event
                        i = start_event.length;
                        while(i-- > 0) {
                            processQ.push(start_event[i]);
                        }
                    }
                    else {
                        // Only one parent
                        processQ.push(start_event);
                    }
                }
            }
        }
        const startx = 40;
        const starty = 40;
        const gridx  = 250;
        const gridy  = 100;
        const radius = 25;
        let maxx = displayspace.clientWidth + displayspace.scrollWidth;
        let maxy = displayspace.clientHeight + displayspace.scrollHeight;      
        while(lastStack.length > 0) {
            start_event = lastStack.pop();
            // Getting element
            const myx = startx + (event_time.get(start_event)[start_event.p] - 1) * gridx;
            const myy = starty + used_processes.get(start_event.p) * gridy;
            // Getting position on svg
            if(myx > maxx) {
                maxx = myx;
            }
            if(myy > maxy) {
                maxy = myy;
            }
            // Getting extent of SVG
            const toadd = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            toadd.setAttributeNS(null, "cx", myx);
            toadd.setAttributeNS(null, "cy", myy);
            toadd.setAttributeNS(null, "r", radius);
            // Drawing circle representing event
            const toadd2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            toadd2.setAttributeNS(null, "x", myx - 7.5);
            toadd2.setAttributeNS(null, "y", myy + 5);
            const toadd3 = document.createTextNode("e");
            toadd2.appendChild(toadd3);
            // Writing e in circle
            const toadd4 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            toadd4.setAttributeNS(null, "x", myx + 2.5);
            toadd4.setAttributeNS(null, "y", myy + 10);
            toadd4.setAttributeNS(null, "class", "subscript");
            const toadd5 = document.createTextNode(start_event.id.toString());
            toadd4.appendChild(toadd5);
            // Adding subscript event ID
            causalgroup.appendChild(toadd);
            causalgroup.appendChild(toadd2);
            causalgroup.appendChild(toadd4);
            // Adding graphical elements
            const end_event = causal_chain.get(start_event);
            if (end_event instanceof Array) {
                i = end_event.length;
                while(i-- > 0) {
                    if(end_event[i] !== null) {
                        causalgroup.appendChild(
                            createArrowLine(end_event[i], start_event, startx, starty, gridx, gridy, used_processes, radius)
                        );
                    }
                }
            }
            else {
                if(end_event!== null) {
                    causalgroup.appendChild(
                        createArrowLine(end_event, start_event, startx, starty, gridx, gridy, used_processes, radius)
                    );
                }
            }
        }
        causalspace.style.width = String(maxx + radius + 20) + 'px';
        causalspace.style.height = String(maxy + radius + 20) + 'px';
        pinboard.style.width = String(maxx + radius + 20) + 'px';
        pinboard.style.height = String(maxy + radius + 20) + 'px';
        current_display_p = process;
        current_display_t = time;
    }
    else {
        causalspace.style.width = displayspace.clientWidth + displayspace.scrollWidth;
        causalspace.style.height = displayspace.clientHeight + displayspace.scrollHeight;
        pinboard.style.width = displayspace.clientWidth + displayspace.scrollWidth;
        pinboard.style.height = displayspace.clientHeight + displayspace.scrollHeight;
        current_display_p = -1;
        current_display_t = -1;
    }
}

function prepareInputbuttons(mytarget, target2, inmin, inmax) {
    const toadd = document.createElement("div");
    toadd.className = "quantity-nav";
    // Creating bounding boxes for + and - buttons
    
    const toadd2 = document.createElement("div");
    toadd2.className = "quantity-button quantity-up";
    toadd2.appendChild(document.createTextNode("+"));
    toadd2.addEventListener("click", function(event) {
        if(event.button <= 1 && !ticking) {
            const oldval = parseInt(target2.value);
            if(oldval < inmax) {
                target2.value = String(oldval + 1);
                ticks[target2.dataset.process] += 1;
                if(mytarget.getElementsByClassName("event").length > 0) {
                    ticking = true;
                    window.requestAnimationFrame((tim) => {
                        updateEventTimes();
                        ticking = false;
                    });
                }
            }
        }
    });
    // Creating + button
    
    const toadd3 = document.createElement("div");
    toadd3.className = "quantity-button quantity-down";
    toadd3.appendChild(document.createTextNode("-"));
    toadd3.addEventListener("click", function(event) {
        if(event.button <= 1 && !ticking) {
            const oldval = parseInt(target2.value);
            if(oldval > inmin) {
                target2.value = String(oldval - 1);
                ticks[target2.dataset.process] -= 1;
                if(mytarget.getElementsByClassName("event").length > 0) {
                    ticking = true;
                    window.requestAnimationFrame((tim) => {
                        updateEventTimes();
                        ticking = false;
                    });
                }
            }
        }
    });
    // Creating - button
    
    toadd.appendChild(toadd2);
    toadd.appendChild(toadd3);
    // Adding buttons to container

    if (isElement(mytarget)) {
        mytarget.appendChild(toadd);
    }   
}

// Creating an event
function createEventVisual(target, offsetX, noupdate = false, testing = false) {
    const toadd = document.createElement("div");
    toadd.className = "event";
    toadd.style.left = String(offsetX - shapeOffset) + "px";
    // Take 7.5 from size of the event button? itself
    const roundedX = Math.round(offsetX);
    // Rounding value to an integer, so it can be compared with and deleted later. No danger of overlap as shapes are > 1px and can't overlap
    if(roundedX > max_events_offset) {
        max_events_offset = offsetX;
    }
    // If this is the rightmost event so far, designate it
    toadd.dataset.myx = roundedX.toString();
    toadd.dataset.process = target.dataset.process;
    // Saving identifier for use in deletion
    const ID_FORMAT = toadd.dataset.process.toString() + '-' + toadd.dataset.myx.toString();
    // Common identifier for detecting clicks 
    const toadd3 = document.createElement("input");
    toadd3.type = "checkbox";
    toadd3.className = "check-label";
    toadd3.id = ID_FORMAT + 'input';
    if(testing) {
        toadd3.checked = true;
        toadd3.disabled = true;
    }
    else {
        toadd3.addEventListener("change", 
            function(event) {
                displayCausalGraph(
                    parseInt(toadd.dataset.process),
                    roundedX
                );
            }
        );
    }
    // Creating an invisible checkbox
    const toadd4 = document.createElement("label");
    toadd4.className = "check-label";
    toadd4.htmlFor = ID_FORMAT + 'input';
    // Create the clickable area
    const toadd5 = document.createElement("span");
    toadd5.className = "event-tip";
    toadd5.id = ID_FORMAT + '-tip';
    // Creating pop up for displaying times
    toadd.appendChild(toadd3);
    toadd.appendChild(toadd4);
    toadd.appendChild(toadd5);
    // Adding elements for displaying event time on click
    target.appendChild(toadd);
    // Adding element
    const toadd2 = createEvent(roundedX, parseInt(target.dataset.process));
    events.push(toadd2);

    if(!noupdate) {
        updateEventTimes();
        displayCausalGraph(current_display_p, current_display_t);
    }
    return [toadd, toadd2];
}

//Deleting an event
function deleteEventVisual(target, currentTarget, noupdate) {
    const intx = parseInt(target.dataset.myx);
    const pintx = parseInt(target.dataset.process);
    let toreturn = null; 
    const rindx = events.map(
        function(e) {
            return e.t;
        }
        ).indexOf(intx);
    // Getting identifier from target
    if(rindx > -1) {
        toreturn = events[rindx];
        events.splice(rindx, 1);
    }
    // Removing element based on target
    if(intx === max_events_offset) {
        if (events.length >= 1) {
            max_events_offset = Math.max.apply(null, events.map(
                function(e) {
                    return e.t;
                }
                ));
        }
        else {
            max_events_offset = 0;
        }
    }
    // If the maximum element has just been removed, find a new maximum
    currentTarget.removeChild(target);
    if(!noupdate) {
        updateEventTimes();
        if(intx === current_display_t && pintx === current_display_p) {
            displayCausalGraph();
        }
        else {
            displayCausalGraph(current_display_p, current_display_t);
        }
    }
    return toreturn;
}

// Manages event creation and deletion
// Manages event creation and deletion
function manageEventVisual(target, offsetX, testing = false) {
    if (addEventsMessage) {
        if(target.className == "slider-bone") {
            // We don't want one event on top of another for the sake of clarity
            return createEventVisual(target, offsetX, false, testing);
        }
    }
    else {
        if(target.className == "event") {
            deleteEventVisual(target, target.parentElement);
        }
        else if (
            Array.from(target.classList).some(
                function(item) {
                    return item === "from" || item === "to";
            })
        ) {
            // Deleting message and the events on from and to processes if either from or to events of the message is deleted
            const messagelist = messagespace.getElementsByClassName("message");
            for (const message of messagelist) {
                if (
                        (target.dataset.myx === message.dataset.fromx
                            && 
                        target.dataset.process === message.dataset.fromprocess
                        ) || 
                        (target.dataset.myx === message.dataset.tox
                            &&
                        target.dataset.process === message.dataset.toprocess
                        )
                ) {
                    const linelement = message.getElementsByTagNameNS("http://www.w3.org/2000/svg", "line");
                    if (linelement.length === 1) {
                        deleteMessage(linelement[0]);    
                    }
                }
            }
        }
    }
}

// Deletes messages. Accepts the line SVG object connecting the two processes as argument
function deleteMessage(target, noupdate = false) {
    const parentElement = target.parentElement;
    if(!(parentElement === null)) {
        const fromprocess = parentElement.dataset.fromprocess;
        const toprocess = parentElement.dataset.toprocess;
        const fromx = parentElement.dataset.fromx;
        const tox = parentElement.dataset.tox;
        const eventlist = Array.from(simspace.getElementsByClassName("event"));
        const fromevent = [];
        const toevent = [];
        for(const event of eventlist) {
            if (event.dataset.myx === fromx && event.dataset.process === fromprocess) {
                fromevent.push(deleteEventVisual(event, event.parentElement, noupdate));
            }
            if(event.dataset.myx === tox && event.dataset.process === toprocess) {
                toevent.push(deleteEventVisual(event, event.parentElement, noupdate));
            }
        }
        const grandParent = parentElement.parentElement;
        grandParent.removeChild(parentElement);
        for(let i = messages.length - 1; i >= 0; i--) {
            if(
                fromevent.some(function(item) {
                    return item === messages[i].event1
                }) &&
                toevent.some(function(item) {
                    return item === messages[i].event2
                })) {
                    messages.splice(i, 1);
                }
        }
    }
}

// Deletes messages on mouse event
function deleteMessageVisual(event) {
    if(!addEventsMessage && event.target === event.currentTarget && event.button < 4) {
        deleteMessage(event.target);
    }
}

// Creates mesages
function createMessageVisual(event) {
    if((!ticking)  && event.button < 4) {
        if(event.target.className === "slider-bone" && addEventsMessage) {
            if (!(messagestate === 1)) {
                createMessageViusalGraphics(event.target, event.currentTarget, event.offsetX);
                messagestate = 1;
            }
            // Signal start of a potential message
        }
        else if ([...event.target.classList].indexOf("event") > -1 && !addEventsMessage) {
            manageEventVisual(event.target, -1);
        }
    }
}

function createMessageViusalGraphics(target, currentTarget, offsetX, testing = false) {
    const toadd = document.createElementNS("http://www.w3.org/2000/svg", "line");
    toadd.setAttributeNS(null, "class", "message");
    const relPos = getRelativePosition(target, currentTarget);
    toadd.setAttributeNS(null, "x1", String(offsetX + relPos.x) + 'px');
    toadd.setAttributeNS(null, "y1", String(relPos.y) + 'px');
    toadd.setAttributeNS(null, "x2", String(offsetX + relPos.x) + 'px');
    toadd.setAttributeNS(null, "y2", String(relPos.y) + 'px');
    // Creating temporary line for guiding message drawing
    messagespace.appendChild(toadd);
    // Making the line visible
    currentMessage = toadd;
    fromMessage = target;
    [fromEvent, fromEventobj] = manageEventVisual(target, offsetX, testing);
}

// Visualize creation
function dragMessageVisual(event) {
    if ((!ticking) && messagestate === 1) {
        window.requestAnimationFrame(function() {
            currentMessage.setAttributeNS(null, "x2", String(event.clientX - simpos.x) + 'px');
            currentMessage.setAttributeNS(null, "y2", String(event.clientY - simpos.y) + 'px');
            ticking = false;
        });
        ticking = true;
        // Throttling events to follow mouse
    }
}

// Common tasks for faliing to create a message
function failedMessageVisual() {
    messagestate = 2;
    messagespace.removeChild(currentMessage);
    deleteEventVisual(fromEvent, fromMessage, true);
    currentMessage = null;
    fromMessage = null;
    fromEvent = null;
    fromEventobj = null;
    messagestate = 0;
}

// Creation of message failed - mouse left simspace
function endDragMessageVisual(event) {
    if((!ticking) && messagestate === 1) {
        failedMessageVisual();
    }
}

// Function to handle graphics part of drawing messages
function drawMessage(line, fromprocess, toprocess, fromx, tox) {
    const pc = {
        x: parseFloat(line.getAttributeNS(null, "x2")),
        y: parseFloat(line.getAttributeNS(null, "y2"))
    };
    // The center of arrows is the end point of the line for message
    const l1 = {
        p1: {
            x: parseFloat(line.getAttributeNS(null, "x1")),
            y: parseFloat(line.getAttributeNS(null, "y1"))
        },
        p2: pc
    };
    // Line object
    const toadd = document.createElementNS("http://www.w3.org/2000/svg", "g");
    toadd.setAttributeNS(null, "class", "message");
    toadd.dataset.fromprocess = fromprocess;
    toadd.dataset.toprocess = toprocess;
    toadd.dataset.fromx = fromx;
    toadd.dataset.tox = tox;
    // Setting up graphics group to represet message
    line.setAttributeNS(null, "class", "");
    // Drawing line connecting two processes
    toadd.appendChild(line);
    // Adding line connecting two timelines to graphics group
    const parallelLine = lineParallel(l1, pc, 15);
    // Getting a smaller parallel line centered at second end point
    const rotateLinePlus = rotateLine(parallelLine, pc, 157.5);
    const rotateLineMinus = rotateLine(parallelLine, pc, -157.5);
    // Mathematical description of lines
    const toadd2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    // Generating SVG lines based on mathematical description
    toadd2.setAttributeNS(null, "points",
        pc.x.toString() + ',' + pc.y.toString() + ' ' +
        rotateLinePlus.p2.x.toString() + ',' + rotateLinePlus.p2.y.toString() + ' ' +
        rotateLineMinus.p2.x.toString() + ',' + rotateLineMinus.p2.y.toString()
    );
    toadd2.setAttributeNS(null, "class", "message-arrow");
    toadd.appendChild(toadd2);
    // Appending + angle arrow
    return toadd;
}

async function showCyclePopup() {
    cyclespace.className = "";
    await new Promise(function(res) {
        setTimeout(res, 5000);
    });
    cyclespace.className = "hidden";
}

// Creation of message ended in a point inside simspace
function finishDragMessageVisual(event) {
    if((!ticking) && messagestate === 1) {
        if(event.target.className === "slider-bone" || event.target.className === "event" || event.target.className === "check-label"
            || event.target.className === "event-tip"
        ) {
            if (fromMessage === event.target || fromMessage.contains(event.target) 
                    || fromMessage.querySelector(".event-tip") === event.target) {
                messagespace.removeChild(currentMessage);
                updateEventTimes();
                currentMessage = null;
                fromMessage = null;
                fromEvent = null;
                fromEventobj = null;
                messagestate = 0;
                // Resetting state for next message
            }
            else {
                messagestate = 3;
                finishDragMessageVisualGraphics(event.target, event.currentTarget, event.offsetX);
                messagestate = 0;
                // Resetting state for next message
            }
        }
        else {
            failedMessageVisual();
        }
    }
}

function finishDragMessageVisualGraphics(target, currentTarget, offsetX, testing = false) {
    const relpos = getRelativePosition(target, currentTarget);
    const [toEvent, toEventobj] = createEventVisual(target, offsetX, true, testing);
    currentMessage.setAttributeNS(null, "x2", String(relpos.x + offsetX) + 'px');
    currentMessage.setAttributeNS(null, "y2", String(relpos.y) + 'px');
    toEvent.classList.add('to');
    // Setting message endpoint for line
    fromEvent.classList.add('from');
    // Setting message startpoint for line
    messagespace.removeChild(currentMessage);
    // Removing temporary line
    currentMessage.addEventListener("click", deleteMessageVisual);
    // Adding event listener for deletion
    messages.push(
        createMessage(
            fromEventobj,
            toEventobj
        )
    );
    // Adding record of message to list of messages
    if(!testing && updateEventTimes()) {
        // Cycle has been detected - undo message
        messages.pop();
        deleteEventVisual(toEvent, toEvent.parentElement);
        deleteEventVisual(fromEvent, fromEvent.parentElement);
        showCyclePopup();
    }
    else {
        messagespace.appendChild(
            drawMessage(currentMessage, fromMessage.dataset.process,
            target.dataset.process, fromEvent.dataset.myx, toEvent.dataset.myx)
        );
        if(!testing) {
            displayCausalGraph(current_display_p, current_display_t);
        }
    }
    // Adding graphics group to show
    currentMessage = null;
    fromMessage = null;
    fromEvent = null;
    fromEventobj = null;
}

function createNode(genMode, defaultval=indefault) {
    return function(event) {
        
        
        const toadd = document.createElement("div");
        toadd.className = "slider-container";
        // Creating a container for the node timeline
        
        const node_len = nodes.length;
        // The index of this process

        const toadd2 = document.createElement("input");
        toadd2.type = "number";
        toadd2.className = "increment";
        toadd2.min = inmin.toString();
        toadd2.max = (inmax > defaultval ? inmax.toString() : defaultval.toString());
        toadd2.value = defaultval;
        toadd2.dataset.process = node_len;
        // Text boxes for setting increment in time step at each processor
        // Change CSS values for class increment should the max increase beyond some digits
        
        const toadd3 = document.createElement("div");
        toadd3.className = "slider";
        // Representing timeline of each node
        
        const toadd4 = document.createElement("div");
        toadd4.className = "slider-bone";
        toadd4.dataset.process = node_len;
        toadd3.appendChild(toadd4);
        // Adding straight line representing timeline
        
        toadd.appendChild(toadd2);
        // Adding input to timeline

        if(genMode) {
            prepareInputbuttons(toadd, toadd2, inmin, inmax);
            // Preparing input buttons   
        }
        else {
            toadd2.tabIndex = "-1";
        }
        
        toadd.appendChild(toadd3);
        // Setting up the a container div for each node
        
        simspace.appendChild(toadd);
        // Adding the container div to the simulation
        
        nodes.push(toadd);
        // Keeping track of the container div
        
        ticks.push(defaultval);
        // Adding to array of process ticks

        if(genMode) {
            updateEventTimes();
        }
        else {
            return toadd4;
        }
    }
}

const createNodePlus = createNode(true);
const createNodeMode = function(tick_val) {
    return createNode(false, tick_val)();
}

function deleteNode(changeMode) {
    return function(event) {
        nodes.pop();
        ticks.pop();
        const node_len = nodes.length;
        let i = messages.length;
        // Removing recod of invalid messages
        while(i-- > 0) {
            if(
                parseInt(messages[i].event1.p >= node_len) ||
                parseInt(messages[i].event2.p >= node_len)
            ) {
                messages.splice(i, 1);        
            }
        }
        // Removing GUI of invalid messages
        const messagelist = messagespace.getElementsByClassName("message");
        for (const message of messagelist) {
            if (
                    ( 
                        parseInt(message.dataset.fromprocess) >= node_len
                    ) || 
                    (
                        parseInt(message.dataset.toprocess) >= node_len
                    )
            ) {
                const linelement = message.getElementsByTagNameNS("http://www.w3.org/2000/svg", "line");
                if (linelement.length === 1) {
                    deleteMessage(linelement[0], true);    
                }
            }
        }
        if(isElement(simspace.lastElementChild)) {
            simspace.removeChild(simspace.lastElementChild);
        }
        // Removing invalid events
        i = events.length;
        while(i-- > 0) {
            if(parseInt(events[i].p) >= node_len) {
                events.splice(i, 1);
            } 
        }
        if(!changeMode) {
            updateEventTimes();
            displayCausalGraph();
        }
    }
}

const deleteNodeMinus = deleteNode(false);
const deleteNodeMode = deleteNode(true);

function deleteAllNodes() {
    let i = nodes.length;
    while(i-- > 0) {
        deleteNodeMode();
    }
}

function updateModes() {
    const setcolor = "#DDFFDD";
    if(addEventsMessage) {
        addMode.style.backgroundColor = setcolor;
        subMode.style.backgroundColor = "";
        simspace.className = "";
    }
    else {
        addMode.style.backgroundColor = "";
        subMode.style.backgroundColor = setcolor;
        simspace.className = "delete";
    }

}

function inputMode(event) {
    const oldevent = addEventsMessage;
    if(event.target == addMode) {
        addEventsMessage = true;
    }
    if(event.target == subMode) {
        addEventsMessage = false;
    }
    if(addEventsMessage != oldevent) {
        updateModes();
    }
}

function useMode(wrappingforanswers) {
    return function(event) {
        let newtext = null;
        for (let ele of wrappingforanswers) {
            ele.classList.toggle("hidden");
        }
        if(mode === 1) {
            newtext = document.createTextNode("Test!");
            window.addEventListener("load", windowChange);
            window.addEventListener("resize", windowChange);

            simspace.addEventListener("mousedown", createMessageVisual);
            simspace.addEventListener("mousemove", dragMessageVisual);
            simspace.addEventListener("mouseleave", endDragMessageVisual);
            simspace.addEventListener("mouseup", finishDragMessageVisual);

            document.getElementById("plus").addEventListener("click", createNodePlus);
            document.getElementById("minus").addEventListener("click", deleteNodeMinus);

            addMode.addEventListener("click", inputMode);
            subMode.addEventListener("click", inputMode);
            deleteAllNodes();
            windowChange();
            mode = 0;
        }
        else if (mode === 0) {
            window.removeEventListener("load", windowChange);
            window.removeEventListener("resize", windowChange);

            simspace.removeEventListener("mousedown", createMessageVisual);
            simspace.removeEventListener("mousemove", dragMessageVisual);
            simspace.removeEventListener("mouseleave", endDragMessageVisual);
            simspace.removeEventListener("mouseup", finishDragMessageVisual);

            document.getElementById("plus").removeEventListener("click", createNodePlus);
            document.getElementById("minus").removeEventListener("click", deleteNodeMinus);

            addMode.removeEventListener("click", inputMode);
            subMode.removeEventListener("click", inputMode);
            newtext = document.createTextNode("Simulate");
            addEventsMessage = true;
            updateModes();
            deleteAllNodes();
            mode = 1;
        }
        else {
            newtext = document.createTextNode("Test!");
            for(let ele of wrappingforanswers) {
                ele.classList.remove("hidden");
            }
            mode = 0;
        }
        test_state = 0;
        while(event.target.firstChild) {
            event.target.removeChild(event.target.lastChild);
        }
        event.target.appendChild(newtext);
    };
}

function prepareGeneratorInput(elements) {
    for (const el of elements) {
        const inputbox = el.querySelector("input[type=number].input-number");
        setInputFilter(inputbox, function(value) {
            return /^\d*$/.test(value) && (value === "" || (
            parseInt(value) <= parseInt(inputbox.max) &&
            parseInt(value) >= parseInt(inputbox.min)))
        });
        inputbox.addEventListener("blur", function(event) {
            if(inputbox.value === "") {
                inputbox.value = inputbox.min;
            }
        });
        const decrement = el.querySelector("span.input-number-decrement");
        decrement.addEventListener('click', function(event) {
            const oldval = parseInt(inputbox.value);
            const min = parseInt(inputbox.min);
            if(oldval > min) {
                inputbox.value = String(oldval - 1);
            }
        });
        const increment = el.querySelector("span.input-number-increment");
        increment.addEventListener('click', function(event) {
            const oldval = parseInt(inputbox.value);
            const max = parseInt(inputbox.max);
            if(oldval < max) {
                inputbox.value = String(oldval + 1);
            }
        });
    }
}

function windowChange(event) {
    const vw = Math.min(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) / 100, 10);
    const curwidth    = parseFloat(simspace.style.width.slice(0, -2));
    displayCausalGraph(current_display_p, current_display_t);
    if (tellspace.clientWidth > mysteryAdjustment(curwidth, vw, max_events_offset)) {
        simspace.style.width = tellspace.clientWidth.toString() + 'px';
    }
    // Try to take up all available screen width
    simpos = getPosition(simspace);
    // Getting position of simspace for use everywhere
    window.requestAnimationFrame(function() {
        let messageList = Array.from(messagespace.childNodes);
        // Converting list of nodes in messagespace into an array. Array should have graphical groups
        const processBones = new Map();
        for (const child of Array.from(simspace.getElementsByClassName("slider-bone"))) {
            processBones.set(child.dataset.process, getRelativePosition(child, simspace).y);
        }
        while(messagespace.firstChild) {
            messagespace.firstChild.remove();
        }
        // Removing nodes
        for (const child of messageList) {
            if(isElement(child)) {
                const grandchild = [...child.getElementsByTagNameNS("http://www.w3.org/2000/svg", "line")];
                if (grandchild.length === 1) {
                    const fromprocess = child.dataset.fromprocess;
                    const toprocess = child.dataset.toprocess;
                    if (processBones.has(fromprocess) && processBones.has(toprocess)) {
                        grandchild[0].setAttributeNS(null, "y1", processBones.get(fromprocess).toString() + 'px');
                        grandchild[0].setAttributeNS(null, "y2", processBones.get(toprocess).toString() + 'px');
                        messagespace.appendChild(
                            drawMessage(grandchild[0], fromprocess, toprocess, child.dataset.fromx,child.dataset.tox)
                        );
                    }
                }
            }
        }
        // Redrawing messages
        displayCausalGraph(current_display_p, current_display_t);
        // Resizing causalspace
        ticking = false;
    });
    ticking = true;
}

async function generator(event) {
    test_state = 1;
    deleteAllNodes();
    const process_number = parseInt(document.getElementById("processors-gen").value);
    const event_number = parseInt(document.getElementById("events-gen").value);
    const messages_number = parseInt(document.getElementById("messages-gen").value);
    const tell_width = tellspace.getBoundingClientRect().width;
    const event_padding = tell_width / 10.15;
    const event_offset = [];
    for(let i = 0; i < process_number; ++i) {
        event_offset.push(event_padding / 2 + Math.random() * event_padding);
    }
    const message_set = new Set();
    let max_ticks = 1;
    switch(test_progress) {
        case 2:
            max_ticks += 2;
        case 1:
            max_ticks += 2;
        default:
        case 0:
    }
    const sliderBones = []
    const outed = generateTest(process_number, event_number, event_padding, messages_number, test_progress, max_ticks);
    for(const mes of outed.mes) {
        message_set.add(mes.e1);
        message_set.add(mes.e2);
    }
    for(let i = 0; i < process_number; ++i) {
        sliderBones.push(createNodeMode(outed.tic[i]));
    }
    let max_time = 0;
    for(const eve of outed.eve) {
        if(!message_set.has(eve)) {
            createEventVisual(sliderBones[eve.p], event_offset[eve.p] + eve.t, true, true);
        }
        max_time = (max_time > event_offset[eve.p] + eve.t) ? max_time : (event_offset[eve.p] + eve.t);
    }
    const throttler = new Semaphore(1);
    const all_at_once = function(sliderBones, simspace, e1, e2, event_offset, process_number) {
        const off1 = event_offset[e1.p] + e1.t;
        const off2 = event_offset[e2.p] + e2.t;
        createMessageViusalGraphics(sliderBones[e1.p], simspace, off1, true);
        finishDragMessageVisualGraphics(sliderBones[e2.p], simspace, off2, true);
        return (off1 > off2) ? off1 : off2;
    }
    for(const mes of outed.mes) {
        await throttler.acquire();
        const e1 = mes.e1;
        const e2 = mes.e2;
        const new_max = all_at_once(sliderBones, simspace, e1, e2, event_offset, process_number);
        max_time = (max_time > new_max) ? max_time : new_max;
        throttler.release();
    }
    const a_slider = simspace.querySelector("div.slider");
    const new_width = max_time 
        + getRelativePosition(a_slider, simspace).x 
        - a_slider.getBoundingClientRect().width / 2 
        + 5 * event_padding ;
    const disp_width = tellspace.getBoundingClientRect().width;
    manageTime(true, (new_width > disp_width) ? new_width : disp_width);
    updateEventTimes(true);
}

function checkAnswers(event) {
    if(event.button <= 1 && test_state === 1 && !gen_tick) {
        gen_tick = true;
        window.requestAnimationFrame((tim) => {
            checkLogic();
            gen_tick = false;
        });
        test_state = 2;
    }
}

function answerToArray(answer) {
    const without_whitespace = answer.replaceAll(' ','');
    return without_whitespace.split(',').map(Number);
}

function checkLogic() {
    const tips = document.querySelectorAll("span.event-tip");
    let wrong = false;
    for(const tip of tips) {
        const useranswer = tip.querySelector("input[type=text].enquirer");
        const correctanswer = tip.querySelector("span.answerer");
        const flipper = tip.querySelector("div.flipper");
        const user_array = answerToArray(useranswer.value);
        const correct_array = answerToArray(correctanswer.textContent);
        let local_wrong = false;
        const declareWrong = () => {
            correctanswer.classList.add("wrong");
            wrong = true;
            local_wrong = true;
        };
        if(user_array.length === correct_array.length) {
            for(let i = 0; i < user_array.length; ++i) {
                if(user_array[i] !== correct_array[i]) {
                    declareWrong();
                    break;
                }
            }
        }
        else {
            declareWrong();
        }
        if(! local_wrong) {
            correctanswer.classList.add("correct");
        }
        flipper.classList.add("answered");
        const dims = tip.getBoundingClientRect();
        const dims2 = tip.parentNode.getBoundingClientRect();
        tip.style.left = String(- dims.width / 2 + dims2.width / 3) + 'px';
    }
    if(!wrong && test_progress < 2) {
        speed.classList.toggle("clickable");
    }
}

function upgradeDifficulty(event) {
    if(event.button <= 1 && test_state === 2 && speed.classList.contains("clickable")) {
        test_state = 2;
        speed.classList.toggle("clickable");
        upgradeDifficultyLogic();
    }
}

function setMinMaxVal(ele, min, max) {
    ele.min = min;
    ele.max = max;
    ele.value = min;
}

function upgradeDifficultyLogic() {
    let event_min = DIFFICULTY.HARD.EVE.MIN;
    let event_max = DIFFICULTY.HARD.EVE.MAX;
    let proc_min = DIFFICULTY.HARD.PRO.MIN;
    let proc_max = DIFFICULTY.HARD.PRO.MAX;
    let mes_min = DIFFICULTY.HARD.MES.MIN;
    let mes_max = DIFFICULTY.HARD.MES.MAX;
    switch(test_progress) {
        case 0:
            needle.style.transform = `rotate(90deg)`;
            event_min = DIFFICULTY.MEDIUM.EVE.MIN;
            event_max = DIFFICULTY.MEDIUM.EVE.MAX;
            proc_min = DIFFICULTY.MEDIUM.PRO.MIN;
            proc_max = DIFFICULTY.MEDIUM.PRO.MAX;
            mes_min = DIFFICULTY.MEDIUM.MES.MIN;
            mes_max = DIFFICULTY.MEDIUM.MES.MAX;
            test_progress = 1;
            break;
        case 1:
            needle.style.transform = `rotate(155deg)`;
            test_progress = 2;
    }
    for(const generator of generator_params) {
        const inputbox = generator.querySelector("input[type=number].input-number");
        if(inputbox.getAttribute("id").includes("events")) {
            setMinMaxVal(inputbox, event_min, event_max);
        }
        else if(inputbox.getAttribute("id").includes("processors")) {
            setMinMaxVal(inputbox, proc_min, proc_max);
        }
        else if(inputbox.getAttribute("id").includes("messages")) {
            setMinMaxVal(inputbox, mes_min, mes_max);
        }
    }
}

prepareGeneratorInput(generator_params);

window.addEventListener("load", windowChange);
window.addEventListener("resize", windowChange);
// Listening for changing window sizes and loads to update positions and widths of elements

tellspace.addEventListener("scroll", (event) => {manageTime();});
// Calling function for dynamically resizing element with maximum scrolls

simspace.addEventListener("mousedown", createMessageVisual);
simspace.addEventListener("mousemove", dragMessageVisual);
simspace.addEventListener("mouseleave", endDragMessageVisual);
simspace.addEventListener("mouseup", finishDragMessageVisual);
// Listening for events leading to creation of a message

document.getElementById("plus").addEventListener("click", createNodePlus);
document.getElementById("minus").addEventListener("click", deleteNodeMinus);
// adding and deleting nodes on click

addMode.addEventListener("click", inputMode);
subMode.addEventListener("click", inputMode);
// Switching between adding and deleting events/messages

modechange.addEventListener("click", useMode(wrappers));
// Switching between test mode and simulate mode

generatebutton.addEventListener("click", (event) => {
    if(event.button <=1 && !gen_tick) {
        gen_tick = true;
        window.requestAnimationFrame((tim) => {
            generator(1);
            gen_tick = false;
        });
    }
});
// Generates a new test on click

check_answers.addEventListener("click", checkAnswers);
// Checks answers of test

speed.addEventListener("click", upgradeDifficulty);
// Upgrade difficulty
updateModes();