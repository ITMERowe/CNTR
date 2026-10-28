package com.cntr.app;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Touch feedback through the system's own haptics (what the keyboard uses). Some phones ignore plain vibrations from
 * apps but always play these. Resolves { done: false } when the phone's touch feedback is off, so JS can fall back.
 */
@CapacitorPlugin(name = "TapFeedback")
public class TapFeedbackPlugin extends Plugin {

    @PluginMethod
    public void perform(PluginCall call) {
        int effect = effectFor(call.getString("kind", "tap"));
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            result.put("done", getBridge().getWebView().performHapticFeedback(effect));
            call.resolve(result);
        });
    }

    private static int effectFor(String kind) {
        boolean modern = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R; // CONFIRM and REJECT need Android 11
        switch (kind) {
            case "strong":
                return HapticFeedbackConstants.VIRTUAL_KEY;
            case "confirm":
                return modern ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS;
            case "reject":
                return modern ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
            default:
                return HapticFeedbackConstants.KEYBOARD_TAP;
        }
    }
}
