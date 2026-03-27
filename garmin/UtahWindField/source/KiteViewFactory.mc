using Toybox.WatchUi;

//! Factory providing 7 kite session screens to ViewLoop.
//! Screen order is designed for rider priority:
//!   1. Control (start/pause/stop)
//!   2. Speed + HR
//!   3. Jumps
//!   4. Counters (fish, rides, foil rides)
//!   5. Session totals
//!   6. Live map
//!   7. Emergency location sender

class KiteViewFactory extends WatchUi.ViewLoopFactory {

    hidden var _emergencyView = null;
    var counterView = null;

    function initialize() {
        ViewLoopFactory.initialize();
        counterView = new CounterView();
    }

    function getSize() {
        return 7;
    }

    function getView(page) {
        switch (page) {
            case 0: return [new ControlView(), new ScreenDelegate()];
            case 1: return [new SpeedView(),   new ScreenDelegate()];
            case 2: return [new JumpView(),    new ScreenDelegate()];
            case 3: return [counterView,       new CounterDelegate(counterView)];
            case 4: return [new SessionView(), new ScreenDelegate()];
            case 5: return [new MapView(),     new ScreenDelegate()];
            case 6:
                if (_emergencyView == null) {
                    _emergencyView = new EmergencyView();
                }
                return [_emergencyView, new EmergencyDelegate(_emergencyView)];
        }
        return [new ControlView(), new ScreenDelegate()];
    }
}
