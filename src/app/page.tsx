import { buildRoadmap } from "@/lib/roadmap-loader";
import { RoadmapFlow } from "@/components/roadmap-flow";

export default async function Page() {
  const roadmap = await buildRoadmap("electrician-bc");

  return <RoadmapFlow roadmap={roadmap} />;
}
