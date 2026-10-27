package com.cntr.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TapFeedbackPlugin.class); // the app's own plugin (src/feedback.ts)
        super.onCreate(savedInstanceState);
    }
}
