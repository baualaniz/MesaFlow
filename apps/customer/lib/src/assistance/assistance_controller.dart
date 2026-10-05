import 'dart:async';

import 'package:flutter/foundation.dart';

import '../contracts/domain_contracts.dart';
import '../session/qr_session.dart';
import 'assistance_gateway.dart';
import 'assistance_repository.dart';

final class AssistanceController extends ChangeNotifier {
  AssistanceController({
    required AssistanceRepository repository,
    required AssistanceGateway gateway,
    required this.session,
  }) : _repository = repository,
       _gateway = gateway;

  final AssistanceRepository _repository;
  final AssistanceGateway _gateway;
  final QrSessionAccess session;
  StreamSubscription<AssistanceRequestContract?>? _subscription;
  AssistanceRequestContract? _request;
  Object? _watchError;
  AssistanceFailure? _actionFailure;
  bool _loading = true;
  bool _busy = false;
  bool _disposed = false;
  int _generation = 0;

  AssistanceRequestContract? get request => _request;
  Object? get watchError => _watchError;
  AssistanceFailure? get actionFailure => _actionFailure;
  bool get loading => _loading;
  bool get busy => _busy;
  bool get hasActiveRequest => _request?.isActive ?? false;

  void start() {
    final generation = ++_generation;
    unawaited(_subscription?.cancel());
    _loading = true;
    _watchError = null;
    _notify();
    _subscription = _repository
        .watchCurrent(
          establishmentId: session.establishmentId,
          sessionId: session.sessionId,
        )
        .listen(
          (request) {
            if (_disposed || generation != _generation) return;
            _request = request;
            _loading = false;
            _watchError = null;
            _notify();
          },
          onError: (Object error) {
            if (_disposed || generation != _generation) return;
            _loading = false;
            _watchError = error;
            _notify();
          },
        );
  }

  Future<bool> create(AssistanceType type) =>
      _run(() => _gateway.create(session: session, type: type));

  Future<bool> cancel() => _run(() => _gateway.cancel(session: session));

  Future<bool> _run(Future<AssistanceActionResult> Function() operation) async {
    if (_busy) return false;
    _busy = true;
    _actionFailure = null;
    _notify();
    try {
      await operation();
      return true;
    } on AssistanceException catch (error) {
      _actionFailure = error.failure;
      return false;
    } catch (_) {
      _actionFailure = AssistanceFailure.unavailable;
      return false;
    } finally {
      _busy = false;
      _notify();
    }
  }

  void clearActionFailure() {
    _actionFailure = null;
    _notify();
  }

  void _notify() {
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
