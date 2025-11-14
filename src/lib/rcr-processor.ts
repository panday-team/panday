/**
 * Relationship Context Recognition (RCR) Processor
 *
 * This module adds conversation memory and relationship understanding to the chat system.
 * It transforms the chatbot from a "search engine with amnesia" into an intelligent
 * conversational agent that understands topic continuity, user expertise levels, and
 * contextual relationships.
 *
 * Key Features:
 * - Topic thread detection and continuity
 * - User knowledge level tracking
 * - Project context awareness
 * - Relationship recognition (comparisons, clarifications, etc.)
 * - Progressive knowledge building
 */

import { db } from "@/server/db";
import { logger } from "@/lib/logger";

export interface RCRContext {
  // Conversation thread information
  conversationThreadId: string;
  conversationMessageId?: string;
  currentTopic?: string;
  topicDepth: "beginner" | "intermediate" | "advanced";
  questionCount: number;

  // User knowledge and preferences
  understoodTopics: string[];
  strugglingTopics: string[];
  preferredStyle: "step_by_step" | "examples" | "concise";
  expertiseLevel: "apprentice" | "journeyman" | "master";

  // Project context
  projectType: "residential" | "commercial" | "industrial";
  codeJurisdiction: "NEC" | "CEC" | "local";
  pastTopics: string[];
  buildingType?: string;

  // Current message analysis
  detectedTopics: string[];
  intent: "question" | "clarification" | "comparison" | "new_topic";
  isComparison: boolean;
  needsExplanation: boolean;
  confusionIndicators: string[];
}

export interface MessageAnalysis {
  topics: string[];
  intent: RCRContext["intent"];
  isComparison: boolean;
  needsExplanation: boolean;
  confusionIndicators: string[];
}

/**
 * Analyzes user message to detect topics, intent, and relationship indicators
 */
export function analyzeMessage(content: string, conversationHistory: string[] = []): MessageAnalysis {
  const lowerContent = content.toLowerCase();

  // Topic detection patterns for electrical trade
  const topicPatterns = {
    conduit_sizing: /\b(conduit|pipe|emt|imc|rigid)\b.*\b(size|diameter|gauge)\b/i,
    wire_gauge: /\b(wire|copper|aluminum).*\b(gauge|awg|size|ampacity)\b/i,
    circuit_loading: /\b(circuit|outlet|receptacle).*\b(load|amp|amperage|capacity)\b/i,
    gfci: /\b(gfci|gfc|gfi|ground.fault)\b/i,
    voltage_drop: /\b(voltage|volt).*\b(drop|loss|calculation)\b/i,
    grounding: /\b(ground|neutral|bonding)\b/i,
    motor_circuits: /\b(motor|hp|horsepower|starter)\b/i,
    transformers: /\b(transformer|secondary|primary)\b/i,
    panelboards: /\b(panel|breaker|main|subpanel)\b/i,
    nec_requirements: /\b(nec|code|article|section)\b/i,
  };

  const detectedTopics: string[] = [];
  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(lowerContent)) {
      detectedTopics.push(topic);
    }
  }

  // Intent detection
  let intent: MessageAnalysis["intent"] = "question";

  // Clarification indicators
  if (/\b(why|how come|what do you mean|explain|clarify|confused)\b/i.test(lowerContent)) {
    intent = "clarification";
  }
  // Comparison indicators
  else if (/\b(what about|vs|versus|compared to|difference|versus|vs\.?)\b/i.test(lowerContent) ||
           /\b(and|but|however)\b.*\?/i.test(lowerContent)) {
    intent = "comparison";
  }
  // New topic indicators (vs continuation)
  else if (conversationHistory.length > 0 &&
           !conversationHistory.some(prev => detectedTopics.some(t => prev.toLowerCase().includes(t)))) {
    intent = "new_topic";
  }

  // Confusion and explanation needs
  const confusionIndicators = [];
  if (/\b(don't understand|confusing|lost|unclear|make sense|help understand)\b/i.test(lowerContent)) {
    confusionIndicators.push("explicit_confusion");
  }
  if (/\b(beginner|newbie|starting out|first time)\b/i.test(lowerContent)) {
    confusionIndicators.push("beginner_level");
  }

  const needsExplanation = intent === "clarification" ||
                          confusionIndicators.length > 0 ||
                          /\b(explain|how does|what is|tell me about)\b/i.test(lowerContent);

  const isComparison = intent === "comparison" ||
                      /\b(both|either|different|compare|choice)\b.*\b(and|or|vs)\b/i.test(lowerContent);

  return {
    topics: detectedTopics,
    intent,
    isComparison,
    needsExplanation,
    confusionIndicators,
  };
}

/**
 * Loads or creates RCR context for a user conversation
 */
export async function getRCRContext(
  userId: string,
  roadmapId: string,
  messageContent: string,
  conversationHistory: string[] = [],
  nodeId?: string,
  nodeTitle?: string,
): Promise<RCRContext> {
  try {
    // Get or create conversation thread
    let thread = await db.conversationThread.findUnique({
      where: {
        userId_roadmapId: {
          userId,
          roadmapId,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10, // Last 10 messages for context
        },
      },
    });

    if (!thread) {
      // Create new thread
      thread = await db.conversationThread.create({
        data: {
          userId,
          roadmapId,
          isActive: true,
        },
        include: { messages: true },
      });
    }

    // Get user knowledge profile
    const knowledge = await db.userKnowledge.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Get project context
    const project = await db.userProject.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Analyze current message
    const analysis = analyzeMessage(messageContent, conversationHistory);

    // Update thread topic if new topic detected
    if (analysis.topics.length > 0 && (!thread.currentTopic || analysis.intent === "new_topic")) {
      await db.conversationThread.update({
        where: { id: thread.id },
        data: {
          currentTopic: analysis.topics[0],
          questionCount: { increment: 1 },
        },
      });
    } else {
      await db.conversationThread.update({
        where: { id: thread.id },
        data: { questionCount: { increment: 1 } },
      });
    }

    // Store message analysis
    const newMessage = await db.conversationMessage.create({
      data: {
        threadId: thread.id,
        role: "user",
        content: messageContent,
        topics: analysis.topics,
        intent: analysis.intent,
        nodeId: nodeId,
        nodeTitle: nodeTitle,
      },
    });

    return {
      conversationThreadId: thread.id,
      conversationMessageId: newMessage.id,
      currentTopic: thread.currentTopic || undefined,
      topicDepth: thread.topicDepth as "beginner" | "intermediate" | "advanced",
      questionCount: thread.questionCount + 1,
      understoodTopics: (knowledge.understoodTopics as string[]) || [],
      strugglingTopics: (knowledge.strugglingTopics as string[]) || [],
      preferredStyle: knowledge.preferredStyle as "step_by_step" | "examples" | "concise",
      expertiseLevel: knowledge.expertiseLevel as "apprentice" | "journeyman" | "master",
      projectType: project.projectType as "residential" | "commercial" | "industrial",
      codeJurisdiction: project.codeJurisdiction as "NEC" | "CEC" | "local",
      pastTopics: (project.pastTopics as string[]) || [],
      buildingType: project.buildingType || undefined,
      detectedTopics: analysis.topics,
      intent: analysis.intent,
      isComparison: analysis.isComparison,
      needsExplanation: analysis.needsExplanation,
      confusionIndicators: analysis.confusionIndicators,
    };
  } catch (error) {
    logger.error("Failed to get RCR context", error, { userId, roadmapId });
    // Return default context on error to maintain functionality
    return {
      conversationThreadId: "default",
      topicDepth: "beginner",
      questionCount: 0,
      understoodTopics: [],
      strugglingTopics: [],
      preferredStyle: "step_by_step",
      expertiseLevel: "apprentice",
      projectType: "residential",
      codeJurisdiction: "NEC",
      pastTopics: [],
      detectedTopics: [],
      intent: "question",
      isComparison: false,
      needsExplanation: false,
      confusionIndicators: [],
    };
  }
}

/**
 * Updates RCR context after AI response
 */
export async function updateRCRContext(
  userId: string,
  roadmapId: string,
  userMessageContent: string,
  assistantResponse: string,
  conversationThreadId: string,
  conversationMessageId: string,
  nodeId?: string,
  nodeTitle?: string,
  wasHelpful: boolean = true,
): Promise<void> {
  try {
    // Store assistant response
    const analysis = analyzeMessage(assistantResponse);
    await db.conversationMessage.create({
      data: {
        threadId: conversationThreadId,
        role: "assistant",
        content: assistantResponse,
        topics: analysis.topics,
        nodeId: nodeId,
        nodeTitle: nodeTitle,
      },
    });

    // Update user knowledge based on interaction
    if (wasHelpful && analysis.topics.length > 0) {
      const knowledge = await db.userKnowledge.findUnique({ where: { userId } });
      if (knowledge) {
        const understoodTopics = new Set([...(knowledge.understoodTopics as string[] || []), ...analysis.topics]);
        await db.userKnowledge.update({
          where: { userId },
          data: {
            understoodTopics: Array.from(understoodTopics),
            expertiseLevel: understoodTopics.size > 10 ? "journeyman" :
                          understoodTopics.size > 5 ? "intermediate" : "apprentice",
          },
        });
      }
    }
  } catch (error) {
    logger.error("Failed to update RCR context", error, { conversationThreadId, userId });
    // Don't throw - RCR updates are not critical
  }
}

/**
 * Generates RCR-enhanced context for AI prompts
 */
export function generateRCRContextPrompt(rcrContext: RCRContext): string {
  const parts = [];

  // Topic continuity context
  if (rcrContext.currentTopic) {
    parts.push(`CONVERSATION CONTEXT: The user is continuing a discussion about "${rcrContext.currentTopic}" (${rcrContext.topicDepth} level, ${rcrContext.questionCount} questions in this thread).`);
  }

  // User knowledge context
  if (rcrContext.understoodTopics.length > 0) {
    parts.push(`USER UNDERSTANDS: ${rcrContext.understoodTopics.join(", ")}`);
  }

  if (rcrContext.strugglingTopics.length > 0) {
    parts.push(`USER STRUGGLES WITH: ${rcrContext.strugglingTopics.join(", ")} - provide extra explanation here`);
  }

  // Project context
  parts.push(`PROJECT CONTEXT: ${rcrContext.projectType} electrical work (${rcrContext.codeJurisdiction} code jurisdiction)`);
  if (rcrContext.buildingType) {
    parts.push(`BUILDING TYPE: ${rcrContext.buildingType}`);
  }
  if (rcrContext.pastTopics.length > 0) {
    parts.push(`PREVIOUS TOPICS DISCUSSED: ${rcrContext.pastTopics.join(", ")}`);
  }

  // Current message analysis
  if (rcrContext.intent === "clarification") {
    parts.push(`MESSAGE INTENT: User is seeking clarification - provide clear, detailed explanations`);
  } else if (rcrContext.intent === "comparison") {
    parts.push(`MESSAGE INTENT: User is comparing options - highlight differences and trade-offs`);
  } else if (rcrContext.intent === "new_topic") {
    parts.push(`MESSAGE INTENT: New topic area - start with foundational concepts`);
  }

  if (rcrContext.needsExplanation) {
    parts.push(`RESPONSE STYLE: Use ${rcrContext.preferredStyle.replace("_", " ")} explanations`);
  }

  if (rcrContext.isComparison) {
    parts.push(`RESPONSE FOCUS: Emphasize differences and relationships between compared items`);
  }

  if (rcrContext.confusionIndicators.length > 0) {
    parts.push(`ADAPTATION NEEDED: User shows confusion - use simpler language and more examples`);
  }

  return parts.length > 0 ? `RELATIONSHIP CONTEXT:\n${parts.join("\n")}\n\n` : "";
}