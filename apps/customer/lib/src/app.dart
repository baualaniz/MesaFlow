import 'package:flutter/material.dart';

import 'cart/cart_store.dart';
import 'config/app_environment.dart';
import 'menu/menu_repository.dart';
import 'order/order_gateway.dart';
import 'order/order_tracking_repository.dart';
import 'routing/app_router.dart';
import 'session/qr_session.dart';

class MesaFlowApp extends StatelessWidget {
  const MesaFlowApp({
    super.key,
    this.environment = AppEnvironment.emulator,
    required this.qrSessionGateway,
    required this.menuRepository,
    this.cartStore = const EphemeralCartStore(),
    this.orderGateway = const UnavailableOrderGateway(),
    this.orderTrackingRepository = const EmptyOrderTrackingRepository(),
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
  Widget build(BuildContext context) {
    return MesaFlowRouterApp(
      environment: environment,
      qrSessionGateway: qrSessionGateway,
      menuRepository: menuRepository,
      cartStore: cartStore,
      orderGateway: orderGateway,
      orderTrackingRepository: orderTrackingRepository,
      initialLocation: initialLocation,
    );
  }
}
