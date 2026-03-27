using Toybox.WatchUi;
using Toybox.Application;
using Toybox.System;

//! Shared delegate for all 4 screens in the ViewLoop.
//! SELECT button: context-sensitive (start/pause/resume on Screen 1, diagnostics on others)
//! BACK button: end session confirmation

class ScreenDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() {
        var app = Application.getApp();

        if (!app.isRecording) {
            // Not recording yet — START the session
            app.startSession();
            WatchUi.requestUpdate();
            return true;
        }

        // Already recording — toggle PAUSE / RESUME
        if (app.isPaused) {
            app.resumeSession();
        } else {
            app.pauseSession();
        }
        WatchUi.requestUpdate();
        return true;
    }

    function onBack() {
        var app = Application.getApp();

        if (app.isRecording) {
            // Session active — confirm stop
            var dialog = new WatchUi.Confirmation("End session?");
            WatchUi.pushView(
                dialog,
                new EndSessionConfirmDelegate(),
                WatchUi.SLIDE_IMMEDIATE
            );
        } else {
            // No session — just exit the app
            System.exit();
        }
        return true;
    }
}

class EndSessionConfirmDelegate extends WatchUi.ConfirmationDelegate {

    function initialize() {
        ConfirmationDelegate.initialize();
    }

    function onResponse(response) {
        if (response == WatchUi.CONFIRM_YES) {
            var app = Application.getApp();
            app.stopSession();
            // stopSession() pushes the ReviewView — don't exit here
        }
        return true;
    }
}
