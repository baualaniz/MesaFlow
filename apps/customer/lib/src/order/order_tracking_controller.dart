import 'dart:async';

import 'package:flutter/foundation.dart';

import 'order_tracking_repository.dart';

final class OrderTrackingController extends ChangeNotifier {
  OrderTrackingController({
    required OrderTrackingRepository repository,
    required this.establishmentId,
    required this.sessionId,
  }) : _repository = repository;

  final OrderTrackingRepository _repository;
  final String establishmentId;
  final String sessionId;
  StreamSubscription<List<TrackedOrder>>? _subscription;
  List<TrackedOrder> _orders = const [];
  Object? _error;
  bool _loading = true;
  bool _disposed = false;
  int _generation = 0;

  List<TrackedOrder> get orders => List.unmodifiable(_orders);
  Object? get error => _error;
  bool get loading => _loading;

  void start() {
    final generation = ++_generation;
    unawaited(_subscription?.cancel());
    _loading = true;
    _error = null;
    _notifyListeners();
    _subscription = _repository
        .watchSession(establishmentId: establishmentId, sessionId: sessionId)
        .listen(
          (orders) {
            if (_disposed || generation != _generation) return;
            _orders = List.unmodifiable(orders);
            _loading = false;
            _error = null;
            _notifyListeners();
          },
          onError: (Object error) {
            if (_disposed || generation != _generation) return;
            _loading = false;
            _error = error;
            _notifyListeners();
          },
        );
  }

  void _notifyListeners() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
