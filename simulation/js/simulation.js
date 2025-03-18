"use strict";
/*
computeScalar(array of events)
Event = {
    t: location     - continuous
    p: Processor    - discrete
}
Message = {
    e: event        - from event object
    e: event        - to event object
}
*/
/*
inArray is an array of events
inMap is a map of processor-increment values or it can be a scalar value
*/
// Represents events
export class Event {
    static counter = 0;
    constructor(time, processor) {
        this.t  = time;
        this.p  = processor;
        this.id = Event.counter;
        Event.counter += 1;
    }
}

// Represents Messages
export class Message {
    static counter = 0;
    constructor(event1, event2) {
        this.e1 = event1;
        this.e2 = event2;
        this.id = Message.counter;
        Message.counter += 1;
    }
    get event1() {
        if (this.e1 instanceof Event) {
            return this.e1;
        }
        else {
            delete this.e1;
            throw new ReferenceError('Cannot find object');
        }
    }
    set event1(event) {

    }
    get event2() {
        if (this.e2 instanceof Event) {
            return this.e2;
        }
        else {
            delete this.e2;
            throw new ReferenceError('Cannot find object');
        }
    }
    set event2 (event) {

    }
}

export function computeVector(inEvents, inMessages, inTicks, result, causalChain) {
    result.clear();
    // Removing previous mappings
    causalChain.clear();
    // Removing previous causal chain
    const eindx = [...inEvents.keys()];
    // Indices of event array that have not yet been processed
    const switchboard = new Map();
    // Used to map a from event into message queue
    const messageQ = new Map();
    // Holds messages that have been sent, but not yet received
    const processes = Array.from(Array(inTicks.length), () => new Array(inTicks.length).fill(0));
    // Holds current time at every process
    const is_stopped = new Array(inTicks.length).fill(-1);
    // If value of index < 0 => process is running
    // If value > -1 has been stopped because of a to message event
    const shouldWait = new Map(); 
    // Used to decide whether the current event is a to event
    const last_event = new Array(inTicks.length).fill(null);
    // Used to establish causal links between events
    let cycleDetect = false;
    // Detect cycle
    let eventInIteration = false;
    inEvents.sort(function(a, b) {
        if(a.t === b.t) {
            return b.p - a.p;
        }
        else {
            return b.t - a.t;
        }
    });
    let i = 0;
    while(i < inMessages.length) {
        switchboard.set(inMessages[i].event1, inMessages[i].event2);
        shouldWait.set(inMessages[i].event2, inMessages[i].event1);
        i++;
    }
    i = eindx.length - 1;
    while( i > -1 && !cycleDetect) {
        const currentEvent = inEvents[eindx[i]];
        if (is_stopped[currentEvent.p] < 0 || messageQ.has(currentEvent)) {
            if (is_stopped[currentEvent.p] < 0) {
                processes[currentEvent.p][currentEvent.p] += inTicks[currentEvent.p];     
            }
            if (switchboard.has(currentEvent)) {
                // Checking if from event
                messageQ.set(switchboard.get(currentEvent), processes[currentEvent.p].slice());
                // Message is now sent
                causalChain.set(inEvents[eindx[i]], last_event[currentEvent.p]);
                // Recording in chain of events
            }
            else if(shouldWait.has(currentEvent)) {
                if(messageQ.has(currentEvent) && (is_stopped[currentEvent.p] < 0 || is_stopped[currentEvent.p] === eindx[i])) {
                    processes[currentEvent.p][currentEvent.p] -= inTicks[currentEvent.p];
                    processes[currentEvent.p] = processes[currentEvent.p].map((elementin, index) => Math.max(elementin, messageQ.get(currentEvent)[index]));
                    processes[currentEvent.p][currentEvent.p] += inTicks[currentEvent.p];
                    // Message has been received and time updated
                    causalChain.set(inEvents[eindx[i]], [last_event[currentEvent.p], shouldWait.get(currentEvent)]);
                    // Causal links between events in case of messages
                    messageQ.delete(currentEvent);
                    // Message received
                    is_stopped[currentEvent.p] = -1;
                }
                else {
                    if(is_stopped[currentEvent.p] < 0) {
                        is_stopped[currentEvent.p] = eindx[i];
                    }
                }
            }
            else {
                causalChain.set(inEvents[eindx[i]], last_event[currentEvent.p]);
            }
            if(is_stopped[currentEvent.p] < 0) {
                result.set(inEvents[eindx[i]], [].concat(processes[currentEvent.p]));
                // Adding to results
                last_event[currentEvent.p] = inEvents[eindx[i]];
                // Last event to happen on the process
                eindx.splice(i, 1);
                // Event has been processed
                //i--;
                // Normal event - tick along
                eventInIteration = true;
                // An event has been processed over this pass over events
            }
        }
        if(--i < 0) {
            i = eindx.length - 1;
            cycleDetect = !eventInIteration;
            // No event has been processed over the last iteration. It means cycle present
            eventInIteration = false;
        }    
    }
    return cycleDetect;
}
export function createEvent(time, processor) {
    return new Event(time, processor);
}

export function createMessage(event1, event2) {
    return new Message(event1, event2);
}