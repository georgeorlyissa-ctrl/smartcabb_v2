import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Mail, Search, Filter, Download, RefreshCw, ArrowLeft, CheckCircle2, XCircle, Clock, Send } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { motion } from '../../lib/motion';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

// Fonction de formatage de date simple
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  provider: string;
  status: 'sent' | 'failed';
  sentAt: string;
  error?: string;
  result?: any;
}

interface EmailHistoryScreenProps {
  onBack?: () => void;
}

export function EmailHistoryScreen({ onBack }: EmailHistoryScreenProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/email-logs`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.to.toLowerCase().includes(term) ||
          log.subject.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  };

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Historique des emails</h1>
              <p className="text-gray-600 mt-1">
                {stats.total} email{stats.total > 1 ? 's' : ''} envoyé{stats.total > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={loadLogs} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Envoyés</p>
                  <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Échoués</p>
                  <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par destinataire ou sujet..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Tous
                </Button>
                <Button
                  variant={statusFilter === 'sent' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('sent')}
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Envoyés
                </Button>
                <Button
                  variant={statusFilter === 'failed' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('failed')}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Échoués
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Emails récents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-500 mb-2" />
                <p className="text-gray-600">Chargement...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucun email trouvé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {log.status === 'sent' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className="font-semibold text-gray-900 truncate">
                            {log.subject}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{log.to}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDate(log.sentAt)}
                            </span>
                          </div>

                          <div>
                            <Badge variant="outline" className="text-xs">
                              {log.provider.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        {log.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Erreur:</strong> {log.error}
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                          {log.status === 'sent' ? 'Envoyé' : 'Échec'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}