import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/app_environment.dart';
import '../screens/entry_page.dart';
import '../screens/invalid_link_page.dart';
import '../screens/menu_page.dart';
import '../theme/mesaflow_theme.dart';
import 'customer_routes.dart';

GoRouter createCustomerRouter({
  required AppEnvironment environment,
  String? initialLocation,
}) {
  return GoRouter(
    initialLocation: initialLocation ?? CustomerRoutes.entry,
    overridePlatformDefaultLocation: initialLocation != null,
    redirect: (context, state) {
      if (state.uri.path == CustomerRoutes.entry &&
          environment == AppEnvironment.emulator) {
        return CustomerRoutes.demoTable;
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
        builder: (context, state) => MenuPage(
          tableRoute: CustomerSessionRouteGuard.requireContext(state),
        ),
      ),
    ],
    errorBuilder: (context, state) => const InvalidLinkPage(),
  );
}

class MesaFlowRouterApp extends StatefulWidget {
  const MesaFlowRouterApp({
    super.key,
    required this.environment,
    this.initialLocation,
  });

  final AppEnvironment environment;
  final String? initialLocation;

  @override
  State<MesaFlowRouterApp> createState() => _MesaFlowRouterAppState();
}

class _MesaFlowRouterAppState extends State<MesaFlowRouterApp> {
  late final GoRouter _router = createCustomerRouter(
    environment: widget.environment,
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
