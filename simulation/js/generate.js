"use strict";

import { Event, Message } from "./simulation.js";

export class generatedOutput {
    constructor(process_number, max_tick) {
        this.ticks = new Array(process_number).fill().map((ele, idx) => 1 + getRandomInt(max_tick))
        this.events = [];
        this.messages = [];
        this.last = null;
    }
    get eve() {
        if (this.events instanceof Array) {
            return this.events;
        }
        else {
            delete this.events;
            throw new ReferenceError('Cannot find object');
        }
    }
    get mes() {
        if (this.messages instanceof Array) {
            return this.messages;
        }
        else {
            delete this.messages;
            throw new ReferenceError('Cannot find object');
        }
    }
    get tic() {
        if (this.ticks instanceof Array) {
            return this.ticks;
        }
        else {
            delete this.ticks;
            throw new ReferenceError('Cannot find object');
        }
    }
    add (toadd) {
        if (toadd instanceof Event) {
            this.events.push(toadd);
            this.last = this.events;
        }
        else if (toadd instanceof Message) {
            this.messages.push(toadd);
            this.last = this.messages;
        }
        else {
            throw new TypeError('Incorrect object passed');
        }
    }
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Box Muller
function modifiedGaussianRandom(mean=1, stdev=1, process_number=2) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    let out = Math.floor(Math.abs(z * stdev + mean));
    if(out >= process_number) {
        return process_number - 1;
    }
    else {
        return out;
    }
}

// Durstenfeld shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = getRandomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function generateTest(process_number, event_number, event_padding, message_number, progress, max_tick) {
    let myout = new generatedOutput(process_number, max_tick);
    let duplicate_check = Array.from(Array(process_number), () =>new Set());
    const createEvent = function(myout) {
        const process = getRandomInt(process_number);
        const time = event_padding * duplicate_check[process].size;
        duplicate_check[process].add(time);
        myout.add(new Event(time, process));
        return 1;
    }
    let number_of_peaks = null;
    let messageRandom = null;
    let process_tumbler = null;
    let peak_centres = null;
    if(progress < 3) {
        process_tumbler = [...Array(process_number).keys()];
        shuffleArray(process_tumbler);
    }
    switch(progress) {
        default:
        case 2:
            messageRandom = function() {
                return getRandomInt(process_number);
            }
            break;
        case 0:
            number_of_peaks = 1 + getRandomInt(2);
        case 1:
            if(number_of_peaks === null) {
                number_of_peaks = 3 + getRandomInt(2);
            }
            peak_centres = new Array(number_of_peaks).fill().map((ele, idx) => (idx + 1) / (number_of_peaks + 1));
            messageRandom = function() {
                const peak_chooser = getRandomInt(peak_centres.length);
                const idxer = modifiedGaussianRandom(process_number * peak_centres[peak_chooser], 1, process_number);
                return process_tumbler[idxer];
            }
    }
    const createMessage = function(myout) {
        const process = messageRandom();
        const time = event_padding * duplicate_check[process].size;
        let process2 = null;
        do{
            process2 = messageRandom();
        } while(process2 === process);
        const time2 = event_padding * duplicate_check[process2].size;
        let e1 = new Event(time, process);
        let e2 = new Event(time2, process2);
        duplicate_check[process].add(time);
        duplicate_check[process2].add(time2);
        myout.add(e1);
        myout.add(e2);
        myout.add(new Message(e1, e2));
        
        return 1;
    }
    for(let i = 0, events_done = 0, messages_done = 0; i < event_number + message_number; ++i) {
        if(events_done == event_number) {
            messages_done += createMessage(myout);
        }
        else if(messages_done == message_number) {
            events_done += createEvent(myout);
        }
        else {
            if(getRandomInt(event_number + message_number) >= event_number) {
                messages_done += createMessage(myout);
            }
            else {
                events_done += createEvent(myout);               
            }
        }
    }
    return myout;
}