#!/bin/bash
set -e

echo "=== Step 1: Building Web Assets with Vite ==="
npm run build

echo "=== Step 2: Preparing Android Project Workspace ==="
BUILD_DIR="android_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/artflow/studio"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/bin"
mkdir -p "$BUILD_DIR/gen"

# Copy built web application into assets
cp -r dist/* "$BUILD_DIR/assets/"
if [ -d "public/assets" ]; then
  mkdir -p "$BUILD_DIR/assets/assets"
  cp -r public/assets/* "$BUILD_DIR/assets/assets/"
fi

# Create AndroidManifest.xml
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.artflow.studio"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name="com.artflow.studio.MainActivity"
            android:label="@string/app_name"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# Create strings.xml
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ArtFlow Studio</string>
</resources>
EOF

# Create app icon
if [ -f "public/assets/aistudio/ArtFlow_Drawing_App_UI_Showcase_eb850341.png" ]; then
  cp "public/assets/aistudio/ArtFlow_Drawing_App_UI_Showcase_eb850341.png" "$BUILD_DIR/res/drawable/ic_launcher.png"
fi

# Create MainActivity.java with native File/Gallery Chooser support and MediaStore Image Saving
cat << 'EOF' > "$BUILD_DIR/src/com/artflow/studio/MainActivity.java"
package com.artflow.studio;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> mUploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1001;

    public class WebAppInterface {
        @JavascriptInterface
        public boolean saveImageToGallery(String base64Data, String filename) {
            try {
                if (base64Data == null) return false;
                if (base64Data.contains(",")) {
                    base64Data = base64Data.split(",")[1];
                }
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                if (bitmap != null) {
                    String title = (filename != null && !filename.isEmpty()) ? filename : "ArtFlow_" + System.currentTimeMillis();
                    String savedUri = MediaStore.Images.Media.insertImage(
                        getContentResolver(),
                        bitmap,
                        title,
                        "Exported Artwork from ArtFlow Studio"
                    );
                    if (savedUri != null) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(MainActivity.this, "Artwork saved to Gallery!", Toast.LENGTH_LONG).show();
                            }
                        });
                        return true;
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);

        webView.addJavascriptInterface(new WebAppInterface(), "AndroidApp");

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                new WebAppInterface().saveImageToGallery(url, "ArtFlow_Export.png");
            }
        });

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                if (mUploadMessage != null) {
                    mUploadMessage.onReceiveValue(null);
                    mUploadMessage = null;
                }
                mUploadMessage = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");

                try {
                    startActivityForResult(Intent.createChooser(intent, "Select Picture"), FILECHOOSER_RESULTCODE);
                    return true;
                } catch (Exception e) {
                    if (mUploadMessage != null) {
                        mUploadMessage.onReceiveValue(null);
                        mUploadMessage = null;
                    }
                    return false;
                }
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    results = new Uri[clipData.getItemCount()];
                    for (int i = 0; i < clipData.getItemCount(); i++) {
                        results[i] = clipData.getItemAt(i).getUri();
                    }
                } else if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            mUploadMessage.onReceiveValue(results);
            mUploadMessage = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"

echo "=== Step 3: Generating R.java and Compiling Resources ==="
aapt package -f -m \
  -J "$BUILD_DIR/src" \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I "$ANDROID_JAR"

echo "=== Step 4: Compiling Java Sources ==="
javac -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$BUILD_DIR/bin" \
  "$BUILD_DIR/src/com/artflow/studio/"*.java

echo "=== Step 5: Translating Bytecode to Dalvik DEX ==="
/usr/bin/dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"

echo "=== Step 6: Packaging Unsigned APK with Assets & Resources ==="
aapt package -f \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -A "$BUILD_DIR/assets" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/bin/app-unsigned.apk"

# Add classes.dex into the APK
cd "$BUILD_DIR/bin"
aapt add app-unsigned.apk classes.dex
cd ../..

echo "=== Step 7: Zipalign 4-byte Boundary Alignment ==="
zipalign -f -p 4 "$BUILD_DIR/bin/app-unsigned.apk" "$BUILD_DIR/bin/app-aligned.apk"

echo "=== Step 8: Generating Debug Keystore and Signing APK ==="
KEYSTORE="$BUILD_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkey -v -keystore "$KEYSTORE" \
    -storepass android -alias androiddebugkey -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

apksigner sign --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$BUILD_DIR/bin/app-debug.apk" \
  "$BUILD_DIR/bin/app-aligned.apk"

echo "=== Step 9: Verifying APK Signature ==="
apksigner verify -v "$BUILD_DIR/bin/app-debug.apk"

echo "=== Step 10: Copying Output APK to Target Directories ==="
mkdir -p .build-outputs
mkdir -p APK_DOWNLOAD

cp "$BUILD_DIR/bin/app-debug.apk" .build-outputs/app-debug.apk
cp "$BUILD_DIR/bin/app-debug.apk" APK_DOWNLOAD/app-debug.apk

echo "=== Step 11: Verification of Generated APK ==="
ls -lh .build-outputs/app-debug.apk
ls -lh APK_DOWNLOAD/app-debug.apk

echo "APK Build Finished Successfully!"
