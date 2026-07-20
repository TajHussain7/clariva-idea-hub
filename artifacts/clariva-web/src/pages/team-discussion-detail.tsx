import { useState, useEffect, useRef } from "react";
import { useDiscussion, useDiscussionMessages, useSendMessage } from "@/hooks/use-discussions";
import { useCurrentUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";

interface TeamDiscussionDetailProps {
  teamId: number;
  discussionId: number;
}

export function TeamDiscussionDetail({ teamId, discussionId }: TeamDiscussionDetailProps) {
  const { data: discussion, isLoading: discussionLoading, error: discussionError } = useDiscussion(discussionId);
  const { data: messages, isLoading: messagesLoading } = useDiscussionMessages(discussionId);
  const { data: currentUser } = useCurrentUser();
  const sendMessage = useSendMessage(discussionId);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      toast({ title: "Error", description: "Message cannot be empty" });
      return;
    }

    try {
      await sendMessage.mutateAsync(messageContent.trim());
      setMessageContent("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (discussionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (discussionError || !discussion) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/team/${teamId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team
        </Button>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">
              {discussionError ? "Failed to load discussion" : "Discussion not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/team/${teamId}`)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{discussion.title}</h1>
          <p className="text-sm text-muted-foreground">
            Created on {new Date(discussion.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Messages Container - Matching Collaborate Tab Style */}
      <Card className="h-[calc(100vh-280px)] min-h-[500px] flex flex-col border-border shadow-lg">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-3">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages && messages.length > 0 ? (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.userId === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm space-y-1 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {!isOwnMessage && (
                        <p
                          className={`text-[10px] font-semibold ${
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          } mb-0.5`}
                        >
                          {message.user.name}
                        </p>
                      )}
                      <p
                        className={`whitespace-pre-wrap break-words ${
                          isOwnMessage ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {message.content}
                      </p>
                      <p
                        className={`text-[10px] ${
                          isOwnMessage
                            ? "text-primary-foreground/60 text-right"
                            : "text-muted-foreground text-right"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-muted-foreground mb-1">
                No messages yet
              </p>
              <p className="text-xs text-muted-foreground opacity-70">
                Start the conversation!
              </p>
            </div>
          )}
        </CardContent>

        {/* Message Input - Matching Collaborate Tab Style */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessage.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendMessage.isPending || !messageContent.trim()}
              className="px-4"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
