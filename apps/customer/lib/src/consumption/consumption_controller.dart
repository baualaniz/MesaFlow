import 'package:flutter/foundation.dart';

import '../session/qr_session.dart';
import 'consumption_gateway.dart';

final class ConsumptionController extends ChangeNotifier {
  ConsumptionController({
    required ConsumptionGateway gateway,
    required this.session,
  }) : _gateway = gateway;

  final ConsumptionGateway _gateway;
  final QrSessionAccess session;
  ConsumptionSummary? _summary;
  ConsumptionFailure? _failure;
  bool _loading = false;
  bool _disposed = false;
  int _generation = 0;

  ConsumptionSummary? get summary => _summary;
  ConsumptionFailure? get failure => _failure;
  bool get loading => _loading;

  Future<void> load() async {
    final generation = ++_generation;
    _loading = true;
    _failure = null;
    _notify();
    try {
      final summary = await _gateway.get(session: session);
      if (_disposed || generation != _generation) return;
      _summary = summary;
    } on ConsumptionException catch (error) {
      if (_disposed || generation != _generation) return;
      _summary = null;
      _failure = error.failure;
    } catch (_) {
      if (_disposed || generation != _generation) return;
      _summary = null;
      _failure = ConsumptionFailure.unavailable;
    } finally {
      if (!_disposed && generation == _generation) {
        _loading = false;
        _notify();
      }
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    super.dispose();
  }
}
