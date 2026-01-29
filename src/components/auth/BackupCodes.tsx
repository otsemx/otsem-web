'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatBackupCode } from '@/lib/2fa';

interface BackupCodesProps {
  codes: string[];
  onClose?: () => void;
}

export function BackupCodes({ codes, onClose }: BackupCodesProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const formattedCodes = codes.map(code => formatBackupCode(code)).join('\n');
    try {
      await navigator.clipboard.writeText(formattedCodes);
      setCopied(true);
      toast.success('Códigos copiados para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar códigos');
    }
  };

  const handleDownload = () => {
    const formattedCodes = codes.map(code => formatBackupCode(code)).join('\n');
    const blob = new Blob([
      `Códigos de Backup - OtsemPay\n`,
      `Gerados em: ${new Date().toLocaleString('pt-BR')}\n\n`,
      `IMPORTANTE: Guarde estes códigos em um local seguro.\n`,
      `Cada código pode ser usado apenas uma vez.\n\n`,
      formattedCodes
    ], { type: 'text/plain' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otsempay-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Códigos baixados com sucesso');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl">Códigos de Backup</CardTitle>
        <CardDescription>
          Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez caso você perca acesso ao seu autenticador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3">
            {codes.map((code, index) => (
              <div
                key={index}
                className="font-mono text-sm bg-background rounded px-3 py-2 text-center border"
              >
                {formatBackupCode(code)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-500">
            ⚠️ <strong>Atenção:</strong> Estes códigos não serão mostrados novamente.
            Certifique-se de salvá-los antes de fechar esta janela.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar
          </Button>
        </div>

        {onClose && (
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
