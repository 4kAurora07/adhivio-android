package com.adhivio.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

public class ReminderWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "adhivio_widget_prefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Update all active widget instances
        for (int widgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        int count = prefs.getInt("widget_reminders_count", 0);

        if (count == 0) {
            views.setViewVisibility(R.id.widget_empty_text, View.VISIBLE);
            views.setViewVisibility(R.id.widget_list_container, View.GONE);

            // Clicking empty widget opens app normally
            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        } else {
            views.setViewVisibility(R.id.widget_empty_text, View.GONE);
            views.setViewVisibility(R.id.widget_list_container, View.VISIBLE);

            // Bind Row 1
            views.setViewVisibility(R.id.widget_row_1, View.VISIBLE);
            views.setTextViewText(R.id.widget_title_1, prefs.getString("widget_title_0", ""));
            views.setTextViewText(R.id.widget_time_1, prefs.getString("widget_time_0", ""));
            setupRowClick(context, views, R.id.widget_row_1, prefs.getString("widget_id_0", null), 101);

            // Bind Row 2
            if (count >= 2) {
                views.setViewVisibility(R.id.widget_divider_1, View.VISIBLE);
                views.setViewVisibility(R.id.widget_row_2, View.VISIBLE);
                views.setTextViewText(R.id.widget_title_2, prefs.getString("widget_title_1", ""));
                views.setTextViewText(R.id.widget_time_2, prefs.getString("widget_time_1", ""));
                setupRowClick(context, views, R.id.widget_row_2, prefs.getString("widget_id_1", null), 102);
            } else {
                views.setViewVisibility(R.id.widget_divider_1, View.GONE);
                views.setViewVisibility(R.id.widget_row_2, View.GONE);
            }

            // Bind Row 3
            if (count >= 3) {
                views.setViewVisibility(R.id.widget_divider_2, View.VISIBLE);
                views.setViewVisibility(R.id.widget_row_3, View.VISIBLE);
                views.setTextViewText(R.id.widget_title_3, prefs.getString("widget_title_2", ""));
                views.setTextViewText(R.id.widget_time_3, prefs.getString("widget_time_2", ""));
                setupRowClick(context, views, R.id.widget_row_3, prefs.getString("widget_id_2", null), 103);
            } else {
                views.setViewVisibility(R.id.widget_divider_2, View.GONE);
                views.setViewVisibility(R.id.widget_row_3, View.GONE);
            }
        }

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void setupRowClick(Context context, RemoteViews views, int viewId, String reminderId, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (reminderId != null) {
            intent.putExtra("reminderId", reminderId);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(context, requestCode, intent, flags);
        views.setOnClickPendingIntent(viewId, pi);
    }

    /** Helper to trigger full update on all instances */
    public static void refreshWidget(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, ReminderWidgetProvider.class));
        if (ids != null && ids.length > 0) {
            Intent intent = new Intent(context, ReminderWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
    }
}
