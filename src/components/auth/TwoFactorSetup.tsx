'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Loader2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import http from '@/lib/http';
import { isValidTotpFormat } from '@/lib/2fa';
import { BackupCodes } from './BackupCodes';

interface User {
  id: string;
  email: string;
  twoFactorEnabled?: boolean;
}

interface TwoFactorSetupProps {
  user: User;
  onSuccess?: () => void;
}

interface SetupResponse {
  secret: string;
  qrCode: string;
}

interface VerifyResponse {
  backupCodes: string[];
}

export function TwoFactorSetup({ user, onSuccess }: TwoFactorSetupProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await http.post<SetupResponse>('/auth/2fa/setup');
      setSetupData(response.data);
      setShowSetupModal(true);
    } catch (error) {
      toast.error('Erro ao iniciar configuração 2FA');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isValidTotpFormat(verificationCode)) {
      toast.error('Código deve ter 6 dígitos');
      return;
    }

    setVerifying(true);
    try {
      const response = await http.post<VerifyResponse>('/auth/2fa/verify', {
        code: verificationCode,
      });

      setBackupCodes(response.data.backupCodes);
      setShowSetupModal(false);
      setShowBackupCodes(true);
      toast.success('2FA ativado com sucesso!');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Código inválido';
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Tem certeza que deseja desativar a autenticação em 2 fatores?')) {
      return;
    }

    setLoading(true);
    try {
      await http.post('/auth/2fa/disable');
      toast.success('2FA desativado com sucesso');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Erro ao desativar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodesClose = () => {
    setShowBackupCodes(false);
    setVerificationCode('');
    setSetupData(null);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Autenticação em 2 Fatores
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user.twoFactorEnabled
                ? 'Sua conta está protegida com 2FA'
                : 'Adicione uma camada extra de segurança à sua conta'}
            </p>
          </div>
          {user.twoFactorEnabled ? (
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Desativar
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={startSetup}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Ativar 2FA
            </Button>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação em 2 Fatores</DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu aplicativo autenticador (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            {setupData?.qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={setupData.qrCode}
                  alt="QR Code 2FA"
                  className="w-48 h-48"
                />
              </div>
            )}

            {/* Manual Entry */}
            {setupData?.secret && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Ou insira manualmente:
                </Label>
                <div className="bg-muted rounded p-3">
                  <code className="text-xs font-mono break-all">
                    {setupData.secret}
                  </code>
                </div>
              </div>
            )}

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verification-code">
                Digite o código de 6 dígitos do app
              </Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Após verificar o código, você receberá códigos de backup.
                  Guarde-os em um local seguro!
                </span>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSetupModal(false)}
                disabled={verifying}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || verifying}
                className="flex-1"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar e Ativar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Modal */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="sm:max-w-lg">
          <BackupCodes codes={backupCodes} onClose={handleBackupCodesClose} />
        </DialogContent>
      </Dialog>
    </>
  );
}
