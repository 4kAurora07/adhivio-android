package com.adhivio.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Intent;
import android.os.Build;
import android.view.WindowManager;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Turn screen on and show when locked to ensure alerts are visible
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }

        // Register our custom plugins AFTER super.onCreate so that the Bridge is initialized.
        registerPlugin(SoundStoragePlugin.class);
        registerPlugin(WidgetPlugin.class);

        // Check if app was opened from a widget click
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent != null && intent.hasExtra("reminderId")) {
            String reminderId = intent.getStringExtra("reminderId");
            WidgetPlugin.setClickedReminderId(reminderId);
        }
    }
}
