import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class BracketConnection {
  const BracketConnection({
    required this.start,
    required this.end,
  });

  final Offset start;
  final Offset end;
}

class BracketConnectorPainter extends CustomPainter {
  BracketConnectorPainter({
    required this.connections,
    this.color = AppColors.border,
    this.strokeWidth = 1,
  });

  final List<BracketConnection> connections;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    for (final connection in connections) {
      final midX = (connection.start.dx + connection.end.dx) / 2;
      final path = Path()
        ..moveTo(connection.start.dx, connection.start.dy)
        ..lineTo(midX, connection.start.dy)
        ..lineTo(midX, connection.end.dy)
        ..lineTo(connection.end.dx, connection.end.dy);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant BracketConnectorPainter oldDelegate) {
    return oldDelegate.connections != connections ||
        oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

class BracketConnectorLayer extends StatelessWidget {
  const BracketConnectorLayer({
    super.key,
    required this.connections,
    this.color = AppColors.border,
    this.strokeWidth = 1,
  });

  final List<BracketConnection> connections;
  final Color color;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: BracketConnectorPainter(
          connections: connections,
          color: color,
          strokeWidth: strokeWidth,
        ),
        size: Size.infinite,
      ),
    );
  }
}
