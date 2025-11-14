"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { ChartPie, Tag, Brain, X } from "lucide-react"; // Assuming these icons are available

interface ConversationInsights {
  topTopics: { topic: string; relevance: number }[];
  expertiseLevel: string;
  messageCount: number;
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
}

interface ConversationInsightsProps {
  conversationId: string;
  onClose: () => void;
}

export function ConversationInsightsPanel({
  conversationId,
  onClose,
}: ConversationInsightsProps) {
  const [insights, setInsights] = useState<ConversationInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const mockInsights: ConversationInsights = {
          topTopics: [
            { topic: "React Flow", relevance: 90 },
            { topic: "Next.js", relevance: 75 },
            { topic: "Prisma", relevance: 60 },
            { topic: "TypeScript", relevance: 50 },
          ],
          expertiseLevel: "Intermediate",
          messageCount: 25,
          sentiment: "positive",
          summary:
            "The conversation primarily focused on integrating React Flow with Next.js, discussing data structures and component interactions. The user demonstrated an intermediate understanding of the topics.",
        };
        setInsights(mockInsights);
      } catch (err) {
        logger.error("Failed to fetch conversation insights", err, {
          conversationId,
        });
        setError("Failed to load insights. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchInsights();
    }
  }, [conversationId]);

  return (
    <div className="flex h-full flex-col border-l bg-background p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversation Insights</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <div className="flex h-full items-center justify-center text-red-500">
          {error}
        </div>
      )}

      {insights && !loading && (
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 flex items-center text-base font-medium">
                <ChartPie className="mr-2 h-4 w-4" /> Top Topics
              </h3>
              <div className="space-y-2">
                {insights.topTopics.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {item.topic}
                    </span>
                    <Progress value={item.relevance} className="h-2 w-2/3" />
                    <span className="text-xs text-muted-foreground">
                      {item.relevance}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center text-base font-medium">
                <Brain className="mr-2 h-4 w-4" /> Expertise Level
              </h3>
              <Badge variant="default">{insights.expertiseLevel}</Badge>
            </div>

            <div>
              <h3 className="mb-2 flex items-center text-base font-medium">
                <Tag className="mr-2 h-4 w-4" /> Message Count
              </h3>
              <p className="text-sm text-muted-foreground">
                {insights.messageCount} messages exchanged
              </p>
            </div>

            <div>
              <h3 className="mb-2 flex items-center text-base font-medium">
                Sentiment
              </h3>
              <Badge
                variant={
                  insights.sentiment === "positive"
                    ? "success"
                    : insights.sentiment === "negative"
                      ? "destructive"
                      : "default"
                }
              >
                {insights.sentiment}
              </Badge>
            </div>

            <div>
              <h3 className="mb-2 text-base font-medium">Summary</h3>
              <p className="text-sm text-muted-foreground">
                {insights.summary}
              </p>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}