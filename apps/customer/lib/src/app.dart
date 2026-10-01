import 'package:flutter/material.dart';

import 'config/app_environment.dart';
import 'routing/app_router.dart';

class MesaFlowApp extends StatelessWidget {
  const MesaFlowApp({
    super.key,
    this.environment = AppEnvironment.emulator,
    this.initialLocation,
  });

  final AppEnvironment environment;
  final String? initialLocation;

  @override
  Widget build(BuildContext context) {
    return MesaFlowRouterApp(
      environment: environment,
      initialLocation: initialLocation,
    );
  }
}
