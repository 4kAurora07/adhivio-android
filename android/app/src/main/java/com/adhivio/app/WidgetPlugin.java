package com.adhivio.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    private static final String TAG = "WidgetPlugin";
    private static final String PREFS_NAME = "adhivio_widget_prefs";

    // Caches the ID of the reminder tapped from the home screen widget
    private static String clickedReminderId = null;

    /** Saves upcoming reminders from React layer to native prefs and triggers widget reload. */
    @PluginMethod
    public void updateWidget(PluginCall call) {
        JSArray reminders = call.getArray("reminders");
        if (reminders == null) {
            call.reject("reminders array is required");
            return;
        }

        Context ctx = getContext();
        SharedPreferences.Editor editor = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        
        // Clear old entries
        editor.clear();

        int size = reminders.length();
        editor.putInt("widget_reminders_count", size);

        for (int i = 0; i < size; i++) {
            try {
                JSONObject r = reminders.getJSONObject(i);
                editor.putString("widget_id_" + i, r.optString("id", ""));
                editor.putString("widget_title_" + i, r.optString("title", ""));
                editor.putString("widget_time_" + i, r.optString("time", ""));
            } catch (JSONException e) {
                Log.e(TAG, "Failed to parse widget reminder item at index " + i, e);
            }
        }

        editor.apply();

        // Trigger widget UI rebuild
        ReminderWidgetProvider.refreshWidget(ctx);
        call.resolve();
    }

    /** Exposes the cache of the clicked reminder ID. Resets after call. */
    @PluginMethod
    public void getClickedReminder(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("reminderId", clickedReminderId);
        
        // Consume cache
        clickedReminderId = null;
        
        call.resolve(ret);
    }

    /** Set by MainActivity when intent contains a clicked reminder ID. */
    public static void setClickedReminderId(String id) {
        clickedReminderId = id;
    }
}
