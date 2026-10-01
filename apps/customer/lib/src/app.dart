import 'package:flutter/material.dart';

import 'config/app_environment.dart';
import 'screens/menu_page.dart';
import 'theme/mesaflow_theme.dart';

class MesaFlowApp extends StatelessWidget {
  const MesaFlowApp({
    super.key,
    this.environment = AppEnvironment.emulator,
  });

  final AppEnvironment environment;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: environment.browserTitle,
      debugShowCheckedModeBanner: false,
      theme: MesaFlowTheme.light,
      home: const MenuPage(),
    );
  }
}
