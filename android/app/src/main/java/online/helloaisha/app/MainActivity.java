package online.helloaisha.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Hello Aisha main activity.
 *
 * The only native responsibility here is creating the notification channel used
 * by Firebase Cloud Messaging ("hello_aisha_channel") before any notification
 * can be delivered. Runtime notification permission and FCM registration are
 * handled by the Capacitor PushNotifications plugin from the web layer, so the
 * granted state and the stored device token always stay in sync.
 */
public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_ID = "hello_aisha_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Aisha messages",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notifications when Aisha replies or becomes available");
        channel.setShowBadge(true);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 300, 200, 300 });
        channel.enableLights(true);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();
        channel.setSound(sound, attributes);

        manager.createNotificationChannel(channel);
    }
}
