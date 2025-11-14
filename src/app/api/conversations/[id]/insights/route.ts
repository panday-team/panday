import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

type MessagePayload = {
  content: string;
  nodeId: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("insights.GET: Unauthorized attempt to access conversation insights.");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const conversationId = params.id;

  try {
    // Find the conversation and include messages
    const conversation = await db.conversationThread.findUnique({
      where: { id: conversationId, userId },
      include: {
        messages: {
          select: {
            content: true,
            nodeId: true,
          },
        },
      },
    });

    if (!conversation) {
      logger.warn(`insights.GET: Conversation not found or unauthorized for ID: ${conversationId}, User: ${userId}`);
      return new NextResponse("Conversation not found", { status: 404 });
    }

    // Fetch user knowledge
    const userKnowledge = await db.userKnowledge.findUnique({
      where: { userId },
      select: {
        understoodTopics: true,
        strugglingTopics: true,
        expertiseLevel: true,
      },
    });

    // Create a mapping of nodes to expertise
    const expertiseMap = new Map();
    
    // Parse understoodTopics and strugglingTopics from JSON if they exist
    if (userKnowledge) {
      const understoodTopics = userKnowledge.understoodTopics as string[] || [];
      const strugglingTopics = userKnowledge.strugglingTopics as string[] || [];
      
      // Map understood topics to their expertise level
      understoodTopics.forEach(topic => {
        expertiseMap.set(topic, "understood");
      });
      
      // Map struggling topics to their expertise level
      strugglingTopics.forEach(topic => {
        expertiseMap.set(topic, "struggling");
      });
    }

    // Calculate topic frequencies and identify top topics
    const topicFrequency: { [key: string]: number } = {};
    conversation.messages.forEach((message: MessagePayload) => {
      if (message.nodeId) {
        topicFrequency[message.nodeId] = (topicFrequency[message.nodeId] || 0) + 1;
      }
    });

    const sortedTopics = Object.entries(topicFrequency).sort(
      (a, b) => b[1] - a[1],
    );
    
    const topTopics = sortedTopics.slice(0, 3).map(([nodeId, count]) => ({
      nodeId,
      count,
      expertise: expertiseMap.get(nodeId) || "unknown", // Default to unknown if no knowledge
      expertiseLevel: userKnowledge?.expertiseLevel || "apprentice", // Get overall expertise level
    }));

    const insights = {
      conversationId: conversation.id,
      totalMessages: conversation.messages.length,
      topTopics,
      userExpertiseLevel: userKnowledge?.expertiseLevel || "apprentice",
      // Add more insights as needed, e.g., sentiment analysis, engagement metrics
    };

    logger.info(`insights.GET: Successfully fetched insights for conversation ID: ${conversationId}`);
    return NextResponse.json(insights);
  } catch (error) {
    logger.error(
      `insights.GET: Failed to fetch insights for conversation ID: ${conversationId}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
