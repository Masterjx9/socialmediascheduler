package com.socialmediaschedulerapp

import android.media.MediaExtractor
import android.media.MediaFormat
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager

/* ---------- Package ---------- */
class MediaMetadataRetrieverPackage : ReactPackage {
    override fun createNativeModules(rc: ReactApplicationContext): List<NativeModule> =
        listOf(MediaMetadataRetrieverModule(rc))

    override fun createViewManagers(rc: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}

/* ---------- Module ---------- */
class MediaMetadataRetrieverModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MediaMetadataRetrieverModule"

    @ReactMethod
    fun getAudioCodec(path: String, promise: Promise) {
        val extractor = MediaExtractor()
        try {
            extractor.setDataSource(path)
            for (i in 0 until extractor.trackCount) {
                val format: MediaFormat = extractor.getTrackFormat(i)
                val mime: String? = format.getString(MediaFormat.KEY_MIME)
                if (mime != null && mime.startsWith("audio/")) {
                    extractor.release()
                    promise.resolve(mime)     // e.g. audio/mp4a-latm  or  audio/opus
                    return
                }
            }
            extractor.release()
            promise.resolve(null)            // no audio stream
        } catch (err: Exception) {
            extractor.release()
            promise.reject("EXTRACT_ERR", err)
        }
    }
}
