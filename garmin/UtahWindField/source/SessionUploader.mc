using Toybox.Communications;
using Toybox.System;
using Toybox.Activity;
using Toybox.Application;
using Toybox.Lang;
using Toybox.Time;

//! Uploads a session summary to liftforecast.com after the rider
//! stops recording. The backend can store this for leaderboards,
//! session history, and social sharing.

class SessionUploader {

    hidden const API_URL = "https://liftforecast.com/api/session-upload";

    var uploadStatus = "PENDING";
    var uploadMsg    = "";

    function initialize() {
    }

    function upload(sessionData) {
        uploadStatus = "UPLOADING";

        var options = {
            :method       => Communications.HTTP_REQUEST_METHOD_POST,
            :headers      => {
                "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };

        Communications.makeWebRequest(
            API_URL,
            sessionData,
            options,
            method(:onUploadResponse) as Lang.Method
        );
    }

    function onUploadResponse(responseCode, data) {
        if (responseCode == 200) {
            uploadStatus = "SUCCESS";
            if (data != null && data.hasKey("url")) {
                uploadMsg = data["url"];
            } else {
                uploadMsg = "Uploaded to UtahWindFinder";
            }
        } else {
            uploadStatus = "FAILED";
            uploadMsg = "HTTP " + responseCode;
        }
    }

    //! Builds the session payload from Activity info + JumpTracker + GPS track
    static function buildPayload(jt, mapLats, mapLons, mapCount) {
        var info = Activity.getActivityInfo();

        var timerMs    = (info != null && info.timerTime != null) ? info.timerTime : 0;
        var distM      = (info != null && info.elapsedDistance != null) ? info.elapsedDistance : 0.0;
        var calories   = (info != null && info.calories != null) ? info.calories : 0;
        var maxSpeedMs = (info != null && info.maxSpeed != null) ? info.maxSpeed : 0.0;
        var avgHR      = (info != null && info.averageHeartRate != null) ? info.averageHeartRate : 0;
        var maxHR      = (info != null && info.maxHeartRate != null) ? info.maxHeartRate : 0;

        // Temperature from Sensor if available
        var temp = null;
        var si = Toybox.Sensor.getInfo();
        if (si != null && si.temperature != null) {
            temp = si.temperature;
        }

        var distNM    = distM * 0.000539957;
        var maxKnots  = maxSpeedMs * 1.94384;
        var durationS = timerMs / 1000;

        // Build GPS track array (downsample to max 100 points for upload)
        var trackStep = 1;
        if (mapCount > 100) {
            trackStep = mapCount / 100;
            if (trackStep < 1) { trackStep = 1; }
        }
        var track = [];
        for (var i = 0; i < mapCount; i += trackStep) {
            track.add([mapLats[i], mapLons[i]]);
        }

        var payload = {
            "type"         => "kite_session",
            "duration_s"   => durationS,
            "distance_nm"  => distNM,
            "max_speed_kts"=> maxKnots,
            "calories"     => calories,
            "avg_hr"       => avgHR,
            "max_hr"       => maxHR,
            "jumps"        => (jt != null) ? jt.jumpCount : 0,
            "max_jump_ft"  => (jt != null) ? jt.maxHeight : 0.0,
            "avg_jump_ft"  => (jt != null) ? jt.avgHeight() : 0.0,
            "total_air_ft" => (jt != null) ? jt.totalHeight : 0.0,
            "crashes_filtered" => (jt != null) ? jt.crashesFiltered : 0,
            "device"       => System.getDeviceSettings().uniqueIdentifier,
            "timestamp"    => Time.now().value(),
            "track"        => track
        };

        if (temp != null) {
            payload.put("water_temp_c", temp);
        }

        return payload;
    }
}
