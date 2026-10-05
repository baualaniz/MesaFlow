import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../cart/cart_store.dart';
import '../config/app_environment.dart';
import '../menu/menu_repository.dart';
import '../order/order_gateway.dart';
import '../order/order_tracking_repository.dart';
import '../screens/entry_page.dart';
import '../screens/invalid_link_page.dart';
import '../screens/session_gate_page.dart';
import '../session/qr_session.dart';
import '../theme/mesaflow_theme.dart';
import 'customer_routes.dart';

GoRouter createCustomerRouter({
  required AppEnvironment environment,
  required QrSessionGateway qrSessionGateway,
  required MenuRepository menuRepository,
  required CartStore cartStore,
  required OrderGateway orderGateway,
  required OrderTrackingRepository orderTrackingRepository,
  String? initialLocation,
}) {
  return GoRouter(
    initialLocation: initialLocation ?? CustomerRoutes.entry,
    overridePlatformDefaultLocation: initialLocation != null,
    redirect: (context, state) {
      if (state.uri.path == CustomerRoutes.entry &&
          environment == AppEnvironment.emulator) {
        return CustomerRoutes.demoQrLocation;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: CustomerRoutes.entry,
        builder: (context, state) => EntryPage(environment: environment),
      ),
      GoRoute(
        path: CustomerRoutes.invalidLink,
        builder: (context, state) => const InvalidLinkPage(),
      ),
      GoRoute(
        path: CustomerRoutes.tablePattern,
        redirect: (context, state) => CustomerSessionRouteGuard.redirect(state),
        builder: (context, state) {
          final tableRoute = CustomerSessionRouteGuard.requireContext(state);
          final tokens = state.uri.queryParametersAll['token'] ?? const [];
          return SessionGatePage(
            tableRoute: tableRoute,
            gateway: qrSessionGateway,
            menuRepository: menuRepository,
            cartStore: cartStore,
            orderGateway: orderGateway,
            orderTrackingRepository: orderTrackingRepository,
            token: tokens.length == 1 ? tokens.single : null,
            onTokenConsumed: () => context.replace(tableRoute.location),
          );
        },
      ),
    ],
    errorBuilder: (context, state) => const InvalidLinkPage(),
  );
}

class MesaFlowRouterApp extends StatefulWidget {
  const MesaFlowRouterApp({
    super.key,
    required this.environment,
    required this.qrSessionGateway,
    required this.menuRepository,
    required this.cartStore,
    required this.orderGateway,
    required this.orderTrackingRepository,
    this.initialLocation,
  });

  final AppEnvironment environment;
  final QrSessionGateway qrSessionGateway;
  final MenuRepository menuRepository;
  final CartStore cartStore;
  final OrderGateway orderGateway;
  final OrderTrackingRepository orderTrackingRepository;
  final String? initialLocation;

  @override
  State<MesaFlowRouterApp> createState() => _MesaFlowRouterAppState();
}

class _MesaFlowRouterAppState extends State<MesaFlowRouterApp> {
  late final GoRouter _router = createCustomerRouter(
    environment: widget.environment,
    qrSessionGateway: widget.qrSessionGateway,
    menuRepository: widget.menuRepository,
    cartStore: widget.cartStore,
    orderGateway: widget.orderGateway,
    orderTrackingRepository: widget.orderTrackingRepository,
    initialLocation: widget.initialLocation,
  );

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: widget.environment.browserTitle,
      debugShowCheckedModeBanner: false,
      theme: MesaFlowTheme.light,
      routerConfig: _router,
    );
  }
}
