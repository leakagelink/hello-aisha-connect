package online.helloaisha.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_ID = "hello_aisha_channel";
    private static final String TAG = "AISHA_LOG";
    private static final int PERMISSION_REQUEST_CODE = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Channel setup
        createNotificationChannel();

        // A brief branded reveal bridges Android's static launch image and the web app.
        showBrandedSplashReveal();
        
        // Delayed permission check to avoid splash screen conflict
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                checkAndRequestPermissions();
            }
        }, 3000);
    }

    private void showBrandedSplashReveal() {
        final FrameLayout root = findViewById(android.R.id.content);
        if (root == null) return;

        final FrameLayout overlay = new FrameLayout(this);
        overlay.setClickable(true);
        overlay.setBackground(new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[] { Color.rgb(12, 5, 27), Color.rgb(52, 18, 92), Color.rgb(70, 16, 78) }
        ));

        final LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setAlpha(0f);
        content.setTranslationY(dp(18));

        final ImageView portrait = new ImageView(this);
        portrait.setImageResource(R.drawable.aisha_splash_logo);
        portrait.setScaleType(ImageView.ScaleType.CENTER_CROP);
        portrait.setElevation(dp(18));
        LinearLayout.LayoutParams portraitParams = new LinearLayout.LayoutParams(dp(132), dp(132));
        portraitParams.bottomMargin = dp(28);
        content.addView(portrait, portraitParams);

        final TextView title = new TextView(this);
        title.setText("HELLO AISHA");
        title.setTextColor(Color.WHITE);
        title.setTextSize(29);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        title.setLetterSpacing(0.08f);
        content.addView(title, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        final TextView tagline = new TextView(this);
        tagline.setText("Someone is here to listen.");
        tagline.setTextColor(Color.rgb(235, 215, 245));
        tagline.setTextSize(14);
        tagline.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams taglineParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        taglineParams.topMargin = dp(10);
        content.addView(tagline, taglineParams);

        final View shimmer = new View(this);
        GradientDrawable shimmerBackground = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[] { Color.TRANSPARENT, Color.rgb(216, 126, 255), Color.TRANSPARENT }
        );
        shimmerBackground.setCornerRadius(dp(3));
        shimmer.setBackground(shimmerBackground);
        shimmer.setAlpha(0.85f);
        LinearLayout.LayoutParams shimmerParams = new LinearLayout.LayoutParams(dp(64), dp(3));
        shimmerParams.topMargin = dp(52);
        content.addView(shimmer, shimmerParams);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        );
        overlay.addView(content, contentParams);
        root.addView(overlay, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        content.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(600)
            .setInterpolator(new AccelerateDecelerateInterpolator())
            .start();
        portrait.animate()
            .scaleX(1.055f)
            .scaleY(1.055f)
            .translationY(-dp(7))
            .setDuration(900)
            .setInterpolator(new AccelerateDecelerateInterpolator())
            .start();
        shimmer.animate()
            .scaleX(1.7f)
            .alpha(0.2f)
            .setDuration(1100)
            .setInterpolator(new AccelerateDecelerateInterpolator())
            .start();

        overlay.postDelayed(() -> overlay.animate()
            .alpha(0f)
            .setDuration(380)
            .withEndAction(() -> root.removeView(overlay))
            .start(), 1250);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

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
            // VISIBILITY_PUBLIC ensures the logo and content are visible on lock screen
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(sound, attributes);

            manager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel initialized");
        }
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST_CODE);
            }
        }
    }
}
