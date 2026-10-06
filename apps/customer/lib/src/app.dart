import 'package:flutter/material.dart';

import 'cart/cart_store.dart';
import 'assistance/assistance_gateway.dart';
import 'assistance/assistance_repository.dart';
import 'config/app_environment.dart';
import 'consumption/consumption_gateway.dart';
import 'menu/menu_repository.dart';
import 'order/order_gateway.dart';
import 'order/order_tracking_repository.dart';
import 'payment/checkout_launcher.dart';
import 'payment/payment_gateway.dart';
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
    this.assistanceGateway = const UnavailableAssistanceGateway(),
    this.assistanceRepository = const EmptyAssistanceRepository(),
    this.consumptionGateway = const UnavailableConsumptionGateway(),
    this.paymentGateway = const UnavailablePaymentGateway(),
    this.checkoutLauncher = const ExternalCheckoutLauncher(),
    this.initialLocation,
  });

  final AppEnvironment environment;
  final QrSessionGateway qrSessionGateway;
  final MenuRepository menuRepository;
  final CartStore cartStore;
  final OrderGateway orderGateway;
  final OrderTrackingRepository orderTrackingRepository;
  final AssistanceGateway assistanceGateway;
  final AssistanceRepository assistanceRepository;
  final ConsumptionGateway consumptionGateway;
  final PaymentGateway paymentGateway;
  final CheckoutLauncher checkoutLauncher;
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
      assistanceGateway: assistanceGateway,
      assistanceRepository: assistanceRepository,
      consumptionGateway: consumptionGateway,
      paymentGateway: paymentGateway,
      checkoutLauncher: checkoutLauncher,
      initialLocation: initialLocation,
    );
  }
}
