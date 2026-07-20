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
import { ArrowLeft, Send } from "lucide-react";

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
        <p className="text-muted-foreground">Loading discussion...</p>
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
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{discussion.title}</h1>
          <p className="text-sm text-muted-foreground">
            Created on {new Date(discussion.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
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
                      className={`max-w-[70%] rounded-lg p-4 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p
                          className={`text-sm font-medium ${
                            isOwnMessage ? "text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {message.user.name}
                        </p>
                        <p
                          className={`text-xs ${
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p
                        className={`text-sm whitespace-pre-wrap break-words ${
                          isOwnMessage ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          )}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessage.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendMessage.isPending || !messageContent.trim()}
            >
              {sendMessage.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
