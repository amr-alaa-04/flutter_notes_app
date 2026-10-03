import 'package:flutter/foundation.dart';
import 'package:shake/shake.dart';

/// Thin wrapper around `package:shake` that owns the accelerometer listener
/// lifecycle and the shake cooldown.
///
/// Why a dedicated service:
///  * exactly **one** accelerometer subscription can be alive at a time – the
///    detector is only created by [start];
///  * [stop] is idempotent and safe to call even when [start] was never called,
///    so `dispose()` can never leak a listener;
///  * [cooldown] swallows the follow-up events of a single physical shake, so
///    one shake can never delete twice and the screen is not spammed while the
///    phone keeps moving.
class ShakeService {
  ShakeService();

  static const int _minimumShakeCount = 2;
  static const double _shakeThresholdGravity = 2.7;
  static const int _shakeSlopTimeMs = 500;
  static const int _shakeCountResetTimeMs = 3000;

  /// Extra debounce on top of the plugin's own settings.
  static const Duration cooldown = Duration(seconds: 3);

  ShakeDetector? _detector;
  DateTime? _lastAcceptedShake;

  /// Registers the shake listener. Calling it twice is a no-op, which prevents
  /// duplicate listeners / duplicate deletions.
  void start(void Function(ShakeEvent event) onShake) {
    if (_detector != null) return;

    _detector = ShakeDetector.autoStart(
      onPhoneShake: (ShakeEvent event) {
        if (!shouldHandle(DateTime.now())) return;

        onShake(event);
      },
      minimumShakeCount: _minimumShakeCount,
      shakeThresholdGravity: _shakeThresholdGravity,
      shakeSlopTimeMS: _shakeSlopTimeMs,
      shakeCountResetTime: _shakeCountResetTimeMs,
    );
  }

  /// Debounce applied on top of the plugin's own settings.
  ///
  /// Returns `true` when [now] may start an action and remembers it, so the
  /// follow-up events of one physical shake — which the plugin keeps emitting for
  /// a while — are dropped instead of deleting again.
  @visibleForTesting
  bool shouldHandle(DateTime now) {
    final DateTime? last = _lastAcceptedShake;

    if (last != null && now.difference(last) < cooldown) return false;

    _lastAcceptedShake = now;
    return true;
  }

  /// Cancels the accelerometer subscription. Safe to call multiple times.
  void stop() {
    _detector?.stopListening();
    _detector = null;
    _lastAcceptedShake = null;
  }
}