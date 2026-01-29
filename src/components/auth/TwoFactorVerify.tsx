'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { isValidTotpFormat, isValidBackupCodeFormat, normalizeBackupCode } from '@/lib/2fa';

interface TwoFactorVerifyProps {
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel?: () => void;
  email?: string;
}

export function TwoFactorVerify({ onVerify, onCancel, email }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate format
    if (useBackupCode) {
      if (!isValidBackupCodeFormat(code)) {
        setError('Código de backup deve ter 8 dígitos (XXXX-XXXX)');
        return;
      }
    } else {
      if (!isValidTotpFormat(code)) {
        setError('Código deve ter 6 dígitos');
        return;
      }
    }

    setVerifying(true);
    try {
      const normalizedCode = useBackupCode ? normalizeBackupCode(code) : code;
      await onVerify(normalizedCode, useBackupCode);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setError('');

    if (useBackupCode) {
      // Allow digits and hyphen for backup codes
      const formatted = value
        .replace(/[^\d-]/g, '')
        .slice(0, 9); // XXXX-XXXX = 9 chars

      // Auto-format with hyphen after 4 digits
      if (formatted.length === 4 && !formatted.includes('-')) {
        setCode(formatted + '-');
      } else {
        setCode(formatted);
      }
    } else {
      // Only digits for TOTP
      setCode(value.replace(/\D/g, '').slice(0, 6));
    }
  };

  const toggleCodeType = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Verificação em 2 Etapas</CardTitle>
          <CardDescription>
            {email && <span className="block mb-2">Entrando como: <strong>{email}</strong></span>}
            {useBackupCode
              ? 'Digite um dos seus códigos de backup'
              : 'Digite o código de 6 dígitos do seu aplicativo autenticador'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="2fa-code">
                {useBackupCode ? 'Código de Backup' : 'Código de Autenticação'}
              </Label>
              <Input
                id="2fa-code"
                type="text"
                inputMode={useBackupCode ? 'text' : 'numeric'}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
                disabled={verifying}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                verifying ||
                (useBackupCode ? code.length < 8 : code.length !== 6)
              }
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar'
              )}
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={toggleCodeType}
                disabled={verifying}
              >
                {useBackupCode
                  ? 'Usar código do autenticador'
                  : 'Usar código de backup'}
              </Button>

              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onCancel}
                  disabled={verifying}
                >
                  Cancelar
                </Button>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground text-center">
                Não consegue acessar seu autenticador? Use um código de backup
                ou entre em contato com o suporte.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
