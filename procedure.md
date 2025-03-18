<!-- ## Steps to be followed for simulating and understanding vector logical clocks -->

### Experimental Steps

1. Load the simulation page

2. Click on the plus and minus buttons to add and delete processes
    - Each click of the plus button adds a process' timeline.
    - Each click of the minus button removes the most recently added process.

3. After adding a process, the increment in that process' clock can be adjusted
    - A number entry is present on the extreme left.
    - The increment can be adjusted by entering a number between 1 and 5.
    - The clock increment can also be adjusted with the small plus and minus buttons to the side.

4. Use the Add/Delete buttons to change modes
    - Add button allows you to add events and messages
    - Delete button allows you to delete events and messages

5. Add events
    - Each process is represented by a straight line representing its timeline.
    - New events can be added by moving the mouse over the line until it is highlighted and clicking once.

6. Move the scrollbar to the left and right
    - Moving the scrollbar to the extreme right gives you additional space on the timeline of all processes.
    - Moving the scrollbar to the extreme left deletes the timeline of processes as long as events do not go out of range.

7. Add messages between processes
    - Processes communicate with each other through messages between them.
    - To add a message, click on the timeline of the process sending the message.
    - Drag while holding the mouse button down to the timeline of the process receiving the message.
    - A message is created when the mouse is lifted.

8. See event times
    - The vector logical time of an event can be seen by clicking on the event while in add mode.
    - This shows a popup, displaying event ID and time.
    - The causal relations leading up to that event are displayed below in the green box. Scroll if needed to look at all the events in a causal chain.

9. Looking at event pop-ups clearly
    - If two or more event pop-ups overlap, you may not be able to see the details of that event.
    - In this case, you may bring the pop-up you desire to read to the front by simply clicking on any part of its visible body.

10. Test your understanding
    - Click on test to challenge yourself with generated timelines!

11. Generation Parameters
    - The green box is replaced by a box with parameters you can adjust - which allows you to control some parts of the timeline generation
    - Number of processes, events and messages can all be controlled.
    - Click generate to get your challenge timeline!

12. Filling up the test
    - There are pop-ups placed next to each event - fill them up.
    - In case you are unable to see where a message clearly ends, you can make timelines fainter by touching/hovering over them.
    - The number beside each timeline shows the ticking step of each process.

13. Checking your answers
    - Click on check your answers once you are done filling up the test.
    - The test shows what you got right and the mistakes made.

14. Challenging yourself
    - There are two ways to challenge yourself - you may either generate new parameters and try again.
    - However, if you get a timeline entirely right, you have the option to take on the next difficulty level.
    - The gauge lights up when this is possible. Simply tap or click on it to increase the difficulty level
    - There are 3 difficulty levels - easy, medium and hard.

15. Once you have tested yourself, you may return to simulate.

### Observations

1. Consistency
    - The circumstances leading to an inconsistent state involve a deadlock on sending and receiving messages.

2. Vector time
    - Working of the vector logical clock can be learned by adjusting events and messages.

3. Concurrency
    - Vector logical time is sufficient to determine the caussal relation between events.
