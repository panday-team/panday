import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { Edit2, Trash2, Plus, MessageSquare, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Conversation {
  id: string;
  title: string;
  createdAt: string | Date; // Allow string for initial fetch
  updatedAt: string | Date; // Allow string for initial fetch
}

// Helper function to format dates
const formatDate = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    logger.warn('Invalid date provided to formatDate', { dateInput });
    return 'Invalid Date';
  }
  return date.toLocaleDateString();
};

interface ConversationHistoryProps {
  userId: string;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  currentConversationId?: string;
}

export function ConversationHistory({
  userId,
  onSelectConversation,
  onCreateNewConversation,
  currentConversationId,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newConversationTitle, setNewConversationTitle] = useState('');

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/conversations?userId=${userId}`);
        const data: Conversation[] = await response.json();
        // Convert date strings to Date objects
        const formattedData = data.map(conv => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        }));
        setConversations(formattedData);
      } catch (error) {
        logger.error('Failed to load conversations', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [userId]);

  const handleCreateConversation = async () => {
    if (!newConversationTitle.trim() || !userId) return;
    
    try {
      // In a real implementation, this would call an API
      // const response = await fetch('/api/conversations', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ title: newConversationTitle, userId })
      // });
      // const newConversation = await response.json();
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newConversationTitle, userId })
      });
      const newConversation: Conversation = await response.json();
      
      setConversations(prev => [newConversation, ...prev]);
      setNewConversationTitle('');
      onSelectConversation(newConversation.id); // Select the newly created conversation
    } catch (error) {
      logger.error('Failed to create conversation', error);
    }
  };

  const handleRenameConversation = async (id: string) => {
    if (!editTitle.trim()) return;
    
    try {
      // In a real implementation, this would call an API
      // await fetch(`/api/conversations/${id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ title: editTitle })
      // });
      
      // Mock implementation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, title: editTitle, updatedAt: new Date() } : conv
        )
      );
      
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      logger.error('Failed to rename conversation', error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      // In a real implementation, this would call an API
      // await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(conv => conv.id !== id));
      if (currentConversationId === id) {
        onCreateNewConversation(); // If deleted current, create a new one
      }
    } catch (error) {
      logger.error('Failed to delete conversation', error);
    }
  };

  const startEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[180px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Input
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            placeholder="New conversation title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateConversation();
            }}
          />
          <Button size="icon" onClick={onCreateNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group ${
                  currentConversationId === conversation.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                {editingId === conversation.id ? (
                  <div className="flex-1 flex gap-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameConversation(conversation.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleRenameConversation(conversation.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={cancelEditing}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {conversation.title}
                        </ReactMarkdown>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(conversation);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}