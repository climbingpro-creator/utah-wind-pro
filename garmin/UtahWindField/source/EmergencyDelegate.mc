using Toybox.WatchUi;
using Toybox.Application;
using Toybox.System;

//! Delegate for the Emergency Location screen.
//! Overrides the default ScreenDelegate behavior:
//!   SELECT = arm / send (not pause session)
//!   BACK = cancel alert or exit

class EmergencyDelegate extends WatchUi.BehaviorDelegate {

    hidden var _view;

    function initialize(view) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onSelect() {
        if (_view == null) { return true; }

        var state = _view.getState();

        if (state == 0) {
            // ST_IDLE → arm
            _view.armAlert();
        } else if (state == 1) {
            // ST_ARMED → send immediately
            _view.sendNow();
        }
        // In SENDING or SENT states, SELECT does nothing

        return true;
    }

    function onBack() {
        if (_view == null) { return true; }

        var state = _view.getState();

        if (state == 1 || state == 2 || state == 3) {
            // Armed, sending, or sent → cancel
            _view.cancelAlert();
            return true;
        }

        // ST_IDLE — use default back behavior (end session or exit)
        var app = Application.getApp();
        if (app.isRecording) {
            var dialog = new WatchUi.Confirmation("End session?");
            WatchUi.pushView(
                dialog,
                new EndSessionConfirmDelegate(),
                WatchUi.SLIDE_IMMEDIATE
            );
        } else {
            System.exit();
        }
        return true;
    }
}
