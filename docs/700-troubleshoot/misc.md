# Miscellaneous 

### T.run VS runMain

There are some subtle behavior differences when T.run is used instead of runMain and its related run functions, i.e. errors might not be invoked or captured as expected, etc.

In more detail, the "run" function is more like an "unsafe run". So far, I've only seen it used as a way to wrap some async code (Like adding an element to a Queue from some normal TS(non-effect-ts) callback. While runMain is a NodeJS-specific runner that hooks into process signals (SIGINT/SIGTERM/etc).  There's also runPromise and runPromiseExit that are often used in tests. The difference between the two is that runPromise will create a rejected promise on failure while, IIRC, runPromiseExit will always succeed but the result of the computation will be inside the "Exit" type that is returned.  Exit is a little bit like an Either type if you want.  In practice, you'll be using runMain and runPromise(Exit) most of the time.

 You might have seen run only in some wrapped async code, does run do anything special?  No in fact for cases like pushing to a queue runFiber should be used. Any concrete run shall use runMain in node or runPromise/runPromiseExit the T.run method was there because it returns a canceller and initially runFiber wasn't exposed the cases where you would have used run are effectively replaced by runFiber that instead of wrapping around cancel just returns the fiber itself.