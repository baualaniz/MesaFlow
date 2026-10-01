import 'package:flutter/material.dart';

import 'config/app_environment.dart';
import 'menu/menu_repository.dart';
import 'routing/app_router.dart';
import 'session/qr_session.dart';

class MesaFlowApp extends StatelessWidget {
  const MesaFlowApp({
    super.key,
    this.environment = AppEnvironment.emulator,
    required this.qrSessionGateway,
    required this.menuRepository,
    this.initialLocation,
  });

  final AppEnvironment environment;
  final QrSessionGateway qrSessionGateway;
  final MenuRepository menuRepository;
  final String? initialLocation;

  @override
  Widget build(BuildContext context) {
    return MesaFlowRouterApp(
      environment: environment,
      qrSessionGateway: qrSessionGateway,
      menuRepository: menuRepository,
      initialLocation: initialLocation,
    );
  }
}
