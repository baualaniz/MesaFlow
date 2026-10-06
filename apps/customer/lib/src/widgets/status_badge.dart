import 'package:flutter/material.dart';

import '../theme/mesaflow_theme.dart';

enum MesaFlowBadgeTone { neutral, success, warning, error, info }

class MesaFlowStatusBadge extends StatelessWidget {
  const MesaFlowStatusBadge({
    super.key,
    required this.label,
    this.tone = MesaFlowBadgeTone.neutral,
    this.icon,
  });

  final String label;
  final MesaFlowBadgeTone tone;
  final IconData? icon;

  (Color, Color) get _colors => switch (tone) {
    MesaFlowBadgeTone.neutral => (
      MesaFlowColors.ivory,
      MesaFlowColors.charcoal,
    ),
    MesaFlowBadgeTone.success => (
      MesaFlowColors.successSurface,
      MesaFlowColors.success,
    ),
    MesaFlowBadgeTone.warning => (
      MesaFlowColors.warningSurface,
      MesaFlowColors.warning,
    ),
    MesaFlowBadgeTone.error => (
      MesaFlowColors.errorSurface,
      MesaFlowColors.error,
    ),
    MesaFlowBadgeTone.info => (MesaFlowColors.infoSurface, MesaFlowColors.info),
  };

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = _colors;
    return Semantics(
      label: label,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(MesaFlowRadius.pill),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: foreground),
                const SizedBox(width: MesaFlowSpacing.xs),
              ],
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: foreground,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
