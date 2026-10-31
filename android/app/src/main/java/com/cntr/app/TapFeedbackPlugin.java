package com.cntr.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Touch feedback through the vibrator's predefined click effects. performHapticFeedback was dropped: it reports success
 * even when the phone plays nothing (touch vibration off, or the maker maps the constant to nothing), so the JS
 * fallback never ran. Resolves { done: false } when there is no vibrator or the call fails, so JS can fall back.
 */
@CapacitorPlugin(name = "TapFeedback")
public class TapFeedbackPlugin extends Plugin {

    @PluginMethod
    public void perform(PluginCall call) {
        JSObject result = new JSObject();
        boolean done = false;
        try {
            Vibrator vibrator = vibrator();
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrate(vibrator, call.getString("kind", "tap"));
                done = true;
            }
        } catch (Exception ignored) {
            // done stays false: JS falls back to the Haptics plugin
        }
        result.put("done", done);
        call.resolve(result);
    }

    private Vibrator vibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @SuppressWarnings("deprecation")
    private static void vibrate(Vibrator vibrator, String kind) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vibrator.vibrate(VibrationEffect.createPredefined(effectFor(kind)));
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(millisFor(kind), VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(millisFor(kind));
        }
    }

    private static int effectFor(String kind) {
        switch (kind) {
            case "strong":
            case "reject":
                return VibrationEffect.EFFECT_HEAVY_CLICK;
            case "confirm":
                return VibrationEffect.EFFECT_DOUBLE_CLICK;
            default:
                return VibrationEffect.EFFECT_CLICK;
        }
    }

    private static long millisFor(String kind) {
        return "tap".equals(kind) ? 30 : 60;
    }
}
