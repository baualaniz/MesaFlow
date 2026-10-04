import 'package:flutter/material.dart';

import '../cart/cart_store.dart';
import '../routing/customer_routes.dart';
import '../menu/menu_repository.dart';
import '../order/order_gateway.dart';
import '../session/qr_session.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/feedback_panel.dart';
import 'menu_page.dart';

class SessionGatePage extends StatefulWidget {
  const SessionGatePage({
    super.key,
    required this.tableRoute,
    required this.gateway,
    required this.menuRepository,
    this.cartStore = const EphemeralCartStore(),
    this.orderGateway = const UnavailableOrderGateway(),
    required this.onTokenConsumed,
    this.token,
  });

  final CustomerTableRoute tableRoute;
  final QrSessionGateway gateway;
  final MenuRepository menuRepository;
  final CartStore cartStore;
  final OrderGateway orderGateway;
  final String? token;
  final VoidCallback onTokenConsumed;

  @override
  State<SessionGatePage> createState() => _SessionGatePageState();
}

class _SessionGatePageState extends State<SessionGatePage> {
  QrSessionAccess? _access;
  QrSessionFailure? _failure;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant SessionGatePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.tableRoute != widget.tableRoute ||
        oldWidget.token != widget.token) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failure = null;
    });
    try {
      final token = widget.token;
      final access = token == null || token.isEmpty
          ? await widget.gateway.restore(widget.tableRoute)
          : await widget.gateway.exchange(
              route: widget.tableRoute,
              token: token,
            );
      if (!mounted) return;
      if (access.tableId != widget.tableRoute.tableId) {
        throw const QrSessionException(QrSessionFailure.invalidQr);
      }
      setState(() {
        _access = access;
        _loading = false;
      });
      if (token != null && token.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onTokenConsumed();
        });
      }
    } on QrSessionException catch (error) {
      if (!mounted) return;
      setState(() {
        _access = null;
        _failure = error.failure;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _access = null;
        _failure = QrSessionFailure.unavailable;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Semantics(
              label: 'Validando el código QR',
              child: const CircularProgressIndicator(),
            ),
          ),
        ),
      );
    }
    if (_access != null) {
      return MenuPage(
        tableRoute: widget.tableRoute,
        sessionAccess: _access!,
        menuRepository: widget.menuRepository,
        cartStore: widget.cartStore,
        orderGateway: widget.orderGateway,
      );
    }
    final failure = _failure ?? QrSessionFailure.unavailable;
    final (title, message, tone) = switch (failure) {
      QrSessionFailure.accessRequired => (
        'Escaneá el QR de esta mesa',
        'Necesitamos el código vigente para abrir una sesión segura.',
        MesaFlowFeedbackTone.info,
      ),
      QrSessionFailure.alreadyUsed => (
        'Este QR ya fue utilizado',
        'Volvé a abrir la mesa desde esta pestaña o pedí un código nuevo al personal.',
        MesaFlowFeedbackTone.warning,
      ),
      QrSessionFailure.invalidQr => (
        'Este QR ya no es válido',
        'Puede haber sido modificado o reemplazado. Escaneá el código actual de la mesa.',
        MesaFlowFeedbackTone.warning,
      ),
      QrSessionFailure.unavailable => (
        'No pudimos validar la mesa',
        'Revisá tu conexión e intentá nuevamente.',
        MesaFlowFeedbackTone.error,
      ),
    };
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(MesaFlowSpacing.lg),
            child: MesaFlowFeedbackPanel(
              title: title,
              message: message,
              tone: tone,
              action: failure == QrSessionFailure.unavailable
                  ? FilledButton.icon(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Reintentar'),
                    )
                  : null,
            ),
          ),
        ),
      ),
    );
  }
}
