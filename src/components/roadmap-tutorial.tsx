import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

interface RoadmapTutorialProps {
  open: boolean;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: "pan",
    title: "Pan",
    description: "Click and drag empty space to move around the roadmap.",
  },
  {
    id: "zoom",
    title: "Zoom",
    description:
      "Use CTRL + Scroll wheel on mouse and keyboard; Use a pinching motion with your fingers on trackpad",
  },
  {
    id: "select",
    title: "Select",
    description:
      "Click a node to open its details panel and update its status.",
  },
  {
    id: "chat",
    title: "Chat",
    description:
      "Get more assistance on your current progress with our AI Chatbot in the bottom-right corner",
  },
];

export function RoadmapTutorial({ open, onComplete }: RoadmapTutorialProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Roadmap Tutorial</DialogTitle>
          <DialogDescription>
            3 simple controls to navigate your career!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-center">
          {TUTORIAL_STEPS.map((step) => (
            <Card key={step.id}>
              <CardHeader>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{step.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onComplete}>Let&apos;s Go!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
