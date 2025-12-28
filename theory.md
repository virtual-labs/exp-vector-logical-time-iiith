### Introduction

Orderings of events are a vital backbone in many systems. Transactions must be processed in the right order to have meaning - be it computational or financial.
Logical clocks step in when synchronizing clocks in a system with different time source. Scalar logical clock provides a simple first step to solving this problem. However, it fails at enforcing causality of events. Vector logical clocks attempt to close this gap.

#### Model of a Distributed System

1. Process - It is a sequence of events. These events are defined based on application. The sequence has total ordering - event _a_ occurs before event _b_ if _a_ comes before _b_ in the sequence. Sending or receiving messages between processes are also events. 
2. Distributed System - A collection of processes as defined before, which only communicate via messages.

#### Happens Before relation

The 'happens before' relation, represented with $\rightarrow$ represents the following three conditions:

1. If an event *a* happens before *b* on the same process, then $a \rightarrow b$
2. If event *a* involves sending a message on one process and event *b* is the receipt of that message by a different process, then $a \rightarrow b$.
3. If $a \rightarrow b$ and $b \rightarrow c$, then $a \rightarrow c$. This relation is transitive.

It is possible for two events *a* and *b* to have both $a \nrightarrow b$ and $b \nrightarrow a$, where $\nrightarrow$ is the logical negative of $\rightarrow$. Such events are said to be *concurrent*.

### Logical Clock

A clock *C* for a process *P* is an incrementing counter assigning each value it takes to an event occurring in that process. This number may bear no relationship with the physical time at the process P. For a system of such clocks, they must satisfy the *clock condition*. If an event *a* happens before event *b*, then the time associated with *a* must be less than that assigned to *b*.  
    Formally,
    $$a \rightarrow b \Rightarrow C(a) < C(b)$$  
    This is called *monotonicity* and satisfies the consistency property of the clock.  
    Non-negative integers are used in logical clocks by convention.

Strong consistency is when the system of clocks satisfy:
    $$a \rightarrow b \Leftrightarrow C(a) < C(b)$$

#### Vector Logical Clock

A number of non-negative integers (one for each process) is used to keep track of time in case of a vector logical clock. They are grouped into a vector.
While one clock time is assigned by the vector to the process itself and used to count local events, other times represent the knowledge of advance in 
time the process has of other processes.

A vector timestamp is in the following format:

$$vt_i [1\dots n]$$

#### Rules for Ordering

1. Local Rule:
    Each process P<sub>i</sub> increments its clock C<sub>i</sub> in the vector between any two immediately following events. This increment is done before the first event in a process' timeline of events as well.
    $$vt_i[i] \Leftarrow vt_i[i] + d$$

2. Global Rule:
    Each process P<sub>i</sub> sends the timestamp of the event associated with sending a message *m* along with the message itself.
    Each process P<sub>j</sub> receiving a message *m* increments its clock C<sub>j</sub> in the vector.
    In case of times of clocks of other processes, the maximum of its prior record of time and the new time recived in the message is taken.
    $$\forall k \in [1\dots n] \; vt_i[k] \Leftarrow max(vt_i[k],vt[k])$$
    $$vt_i[i] \Leftarrow vt_i[i] + d$$

For two vectors $V_a$ and $V_b$, we say $V_a > V_b$ when:
$$\forall i \in [1\dots n] \; V_a[i] \geq V_b[i], \; V_a \neq V_b$$

The causal relationship betwwen events $a$ and $b$ can be determined by considering their vector timestamps.
$$ V_a < V_b \Leftrightarrow a \rightarrow b $$
$$ V_a \ngeq V_b \; \cap \; V_b \ngeq V_a \Leftrightarrow a \parallel b \text{ , a and b are concurrent}$$

Using the happens before relation can give only a partial ordering of events on the system with this clock. Total ordering requires using other parameters like process ID to break ties.

