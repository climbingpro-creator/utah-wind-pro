using Toybox.WatchUi;
using Toybox.Lang;

//! Input delegate for the CounterView.
//! SELECT = increment, HOLD = decrement, UP/DOWN = cycle counter.

class CounterDelegate extends WatchUi.BehaviorDelegate {

    hidden var _view;

    function initialize(view) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onSelect() {
        _view.increment();
        return true;
    }

    function onBack() {
        _view.decrement();
        return true;
    }

    function onNextPage() {
        _view.cycleNext();
        return true;
    }

    function onPreviousPage() {
        _view.cyclePrev();
        return true;
    }
}
