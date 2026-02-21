import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import {
  Mail,
  Phone,
  User,
  Calendar,
  ArrowLeft,
  Search,
  CheckCircle as Check,
  Eye,
  Globe,
  MessageSquare
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ContactMessage {
  key: string;
  value: {
    name: string;
    email: string;
    phone: string | null;
    message: string;
    language: string;
    source: string;
    created_at: string;
    read: boolean;
  };
}

export function ContactMessagesScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/contact/messages`;
      
      console.log('📤 Chargement des messages depuis:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Réponse reçue. Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);
      
      // Vérifier que data.messages existe et est un tableau
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
        console.log(`✅ ${data.messages.length} message(s) chargé(s)`);
      } else {
        console.warn('⚠️ Format de données inattendu:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Impossible de charger les messages'}`);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageKey: string) => {
    try {
      const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/contact/mark-read`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageKey })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      // Mettre à jour localement
      setMessages(messages.map(msg => 
        msg.key === messageKey 
          ? { ...msg, value: { ...msg.value, read: true } }
          : msg
      ));

      if (selectedMessage && selectedMessage.key === messageKey) {
        setSelectedMessage({
          ...selectedMessage,
          value: { ...selectedMessage.value, read: true }
        });
      }

      toast.success('Message marqué comme lu');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredMessages = messages.filter(msg => {
    // Vérifier que msg et msg.value existent
    if (!msg || !msg.value) return false;
    
    const matchesSearch = 
      msg.value.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.value.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.value.message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'read' && msg.value.read) ||
      (filter === 'unread' && !msg.value.read);

    return matchesSearch && matchesFilter;
  });

  const unreadCount = messages.filter(msg => msg && msg.value && !msg.value.read).length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages de Contact</h1>
                <p className="text-sm text-gray-600">
                  {messages.length} message{messages.length > 1 ? 's' : ''} total
                  {unreadCount > 0 && (
                    <span className="ml-2 text-orange-600">
                      • {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              onClick={loadMessages}
              variant="outline"
              size="sm"
            >
              Actualiser
            </Button>
          </div>

          {/* Filtres */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, email ou message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Non lus ({unreadCount})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                Lus
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Liste des messages */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      Chargement...
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Aucun message trouvé
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMessages.map((msg) => (
                        <div
                          key={msg.key}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedMessage?.key === msg.key ? 'bg-blue-50 hover:bg-blue-50' : ''
                          } ${!msg.value.read ? 'bg-orange-50/50' : ''}`}
                          onClick={() => setSelectedMessage(msg)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <p className="font-medium text-sm">{msg.value.name}</p>
                            </div>
                            {!msg.value.read && (
                              <Badge variant="destructive" className="text-xs">Nouveau</Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500 mb-2 truncate">
                            {msg.value.email}
                          </p>
                          
                          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                            {msg.value.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(msg.value.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Détail du message */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Détails du message</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMessage ? (
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-6">
                      {/* Actions */}
                      <div className="flex gap-2">
                        {!selectedMessage.value.read && (
                          <Button
                            size="sm"
                            onClick={() => markAsRead(selectedMessage.key)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Marquer comme lu
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${selectedMessage.value.email}`)}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Répondre par email
                        </Button>
                      </div>

                      {/* Informations */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Nom
                            </label>
                            <p className="font-medium">{selectedMessage.value.name}</p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Email
                            </label>
                            <p className="font-medium">{selectedMessage.value.email}</p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Téléphone
                            </label>
                            <p className="font-medium">{selectedMessage.value.phone || 'Non renseigné'}</p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Langue
                            </label>
                            <p className="font-medium uppercase">{selectedMessage.value.language}</p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Date
                            </label>
                            <p className="font-medium">
                              {new Date(selectedMessage.value.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Statut
                            </label>
                            <div>
                              {selectedMessage.value.read ? (
                                <Badge variant="secondary">Lu</Badge>
                              ) : (
                                <Badge variant="destructive">Non lu</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Message
                          </label>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-900 whitespace-pre-wrap">
                              {selectedMessage.value.message}
                            </p>
                          </div>
                        </div>

                        {/* Métadonnées */}
                        <div className="border-t pt-4">
                          <p className="text-xs text-gray-400">
                            <strong>Source :</strong> {selectedMessage.value.source}
                            <br />
                            <strong>ID :</strong> {selectedMessage.key}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[calc(100vh-280px)] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Sélectionnez un message pour voir les détails</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}