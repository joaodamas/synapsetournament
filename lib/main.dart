import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://ohkfdmpcbvwiqlnonihh.supabase.co',
    anonKey: 'PASTE_YOUR_ANON_KEY_HERE',
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: AppTheme.light(),
      home: const ConnectionTestPage(),
    );
  }
}

class ConnectionTestPage extends StatefulWidget {
  const ConnectionTestPage({super.key});

  @override
  State<ConnectionTestPage> createState() => _ConnectionTestPageState();
}

class _ConnectionTestPageState extends State<ConnectionTestPage> {
  bool _loading = false;
  String? _status;

  Future<void> _testConnection() async {
    setState(() {
      _loading = true;
      _status = null;
    });

    try {
      await Supabase.instance.client.from('tournaments').insert({
        'name': 'Torneio Teste Vercel',
        'format': 'single_elimination',
        'game_name': 'Demo Game',
      });

      setState(() => _status = 'Conexao sucesso!');
    } catch (error) {
      setState(() => _status = 'Erro: $error');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teste de Conexao')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ElevatedButton(
              onPressed: _loading ? null : _testConnection,
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Inserir torneio teste'),
            ),
            if (_status != null) ...[
              const SizedBox(height: 16),
              Text(
                _status!,
                style: const TextStyle(color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
