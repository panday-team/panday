import { roadmapCache } from "@/lib/roadmap-cache";
import { RoadmapFlow } from "@/components/roadmap-flow";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function RoadmapPage() {
  const roadmap = await roadmapCache.get("electrician-bc");

  return (
    <ErrorBoundary>
      <RoadmapFlow roadmap={roadmap} />
    </ErrorBoundary>
  );
}
