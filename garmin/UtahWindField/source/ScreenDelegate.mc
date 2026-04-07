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
            // Check if we have a crashed session to recover
            if (app.hasCrashedSession) {
                // Show the recovered session details in ReviewView
                _showCrashedSessionReview(app);
                return true;
            }
            
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
        } else if (app.hasCrashedSession) {
            // Discard crashed session and allow new start
            app.clearCrashedSession();
            WatchUi.requestUpdate();
        } else {
            // No session — just exit the app
            System.exit();
        }
        return true;
    }
    
    //! Build a ReviewView from crashed session data
    hidden function _showCrashedSessionReview(app) {
        var data = app.getCrashedSessionData();
        if (data == null) { return; }
        
        var review = new ReviewView();
        
        // Populate from checkpoint data
        var timerMs = data.hasKey("timer_ms") ? data["timer_ms"] : 0;
        var distM = data.hasKey("distance_m") ? data["distance_m"] : 0.0;
        var maxSpeedMs = data.hasKey("max_speed_ms") ? data["max_speed_ms"] : 0.0;
        
        review.durationStr = _fmtTimer(timerMs);
        review.distNM = distM * 0.000539957;
        review.maxKnots = maxSpeedMs * 1.94384;
        review.avgKnots = (timerMs > 0) ? (review.distNM / (timerMs / 3600000.0)) : 0.0;
        review.calories = data.hasKey("calories") ? data["calories"] : 0;
        review.avgHR = data.hasKey("avg_hr") ? data["avg_hr"] : 0;
        review.maxHR = data.hasKey("max_hr") ? data["max_hr"] : 0;
        review.jumpCount = data.hasKey("jumps") ? data["jumps"] : 0;
        review.maxJumpFt = data.hasKey("max_jump_ft") ? data["max_jump_ft"] : 0.0;
        
        // Calculate avg jump from total
        var totalJumpFt = data.hasKey("total_jump_ft") ? data["total_jump_ft"] : 0.0;
        review.avgJumpFt = (review.jumpCount > 0) ? (totalJumpFt / review.jumpCount) : 0.0;
        
        review.crashesFiltered = data.hasKey("crashes_filtered") ? data["crashes_filtered"] : 0;
        review.uploadStatus = "RECOVERED";
        
        // No GPS track available from checkpoint (too memory-intensive to save)
        review.trackCount = 0;
        
        WatchUi.pushView(review, new CrashedSessionReviewDelegate(app, review), WatchUi.SLIDE_UP);
    }
    
    hidden function _fmtTimer(ms) {
        if (ms == null || ms <= 0) { return "00:00"; }
        var totalSec = (ms / 1000).toNumber();
        var hrs  = totalSec / 3600;
        var mins = (totalSec % 3600) / 60;
        var secs = totalSec % 60;
        if (hrs > 0) {
            return hrs.format("%d") + ":" + mins.format("%02d") + ":" + secs.format("%02d");
        }
        return mins.format("%02d") + ":" + secs.format("%02d");
    }
}

//! Delegate for reviewing a crashed session
class CrashedSessionReviewDelegate extends WatchUi.BehaviorDelegate {
    hidden var _app;
    hidden var _view;
    
    function initialize(app, view) {
        BehaviorDelegate.initialize();
        _app = app;
        _view = view;
    }
    
    function onSelect() {
        if (_view != null) {
            _view.togglePage();
        }
        return true;
    }
    
    function onBack() {
        // Clear the crashed session and go back to main screen
        _app.clearCrashedSession();
        WatchUi.popView(WatchUi.SLIDE_DOWN);
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
