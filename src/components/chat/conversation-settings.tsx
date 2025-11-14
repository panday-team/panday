"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { Settings, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ConversationSettings {
  explanationStyle: "concise" | "detailed";
  expertiseLevel: number; // 0-100
  projectType: "web" | "mobile" | "desktop" | "backend" | "fullstack" | "other";
  codeJurisdiction: "none" | "bc" | "alberta" | "ontario" | "federal" | "international";
  includeCodeExamples: boolean;
  useRCR: boolean; // RCR = Roadmap Contextual Reasoning
  temperature: number; // Add temperature setting
}

export interface ConversationSettingsProps {
  initialSettings: ConversationSettings;
  onSave: (settings: ConversationSettings) => void;
  onClose: () => void;
}

export function ConversationSettingsPanel({
  initialSettings,
  onSave,
  onClose,
}: ConversationSettingsProps) {
  const [settings, setSettings] = useState<ConversationSettings>(initialSettings);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleSave = () => {
    logger.info("Saving conversation settings", { settings });
    onSave(settings);
    setIsOpen(false);
    onClose();
  };

  const handleCancel = () => {
    logger.info("Cancelling conversation settings changes");
    setSettings(initialSettings); // Reset to initial settings
    setIsOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Conversation Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conversation Settings</DialogTitle>
          <DialogDescription>
            Customize the AI's response behavior.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="explanationStyle" className="text-right">
              Explanation Style
            </Label>
            <Select
              value={settings.explanationStyle}
              onValueChange={(value: "concise" | "detailed") =>
                setSettings((prev) => ({
                  ...prev,
                  explanationStyle: value,
                }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expertiseLevel" className="text-right">
              Expertise Level
            </Label>
            <Slider
              id="expertiseLevel"
              min={0}
              max={100}
              step={10}
              value={[settings.expertiseLevel]}
              onValueChange={(value: number[]) =>
                setSettings((prev) => ({ ...prev, expertiseLevel: value[0] as number }))
              }
              className="col-span-3"
            />
            <span className="col-span-1 text-right text-sm text-muted-foreground">
              {settings.expertiseLevel}%
            </span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectType" className="text-right">
              Project Type
            </Label>
            <Select
              value={settings.projectType}
              onValueChange={(value: "web" | "mobile" | "desktop" | "backend" | "fullstack" | "other") =>
                setSettings((prev) => ({
                  ...prev,
                  projectType: value,
                }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="fullstack">Fullstack</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="codeJurisdiction" className="text-right">
              Code Jurisdiction
            </Label>
            <Select
              value={settings.codeJurisdiction}
              onValueChange={(value: "none" | "bc" | "alberta" | "ontario" | "federal" | "international") =>
                setSettings((prev) => ({
                  ...prev,
                  codeJurisdiction: value,
                }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bc">British Columbia</SelectItem>
                <SelectItem value="alberta">Alberta</SelectItem>
                <SelectItem value="ontario">Ontario</SelectItem>
                <SelectItem value="federal">Federal (Canada)</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2 col-span-4">
            <Label htmlFor="includeCodeExamples">Include Code Examples</Label>
            <Switch
              id="includeCodeExamples"
              checked={settings.includeCodeExamples}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev) => ({ ...prev, includeCodeExamples: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-2 col-span-4">
            <Label htmlFor="useRCR">Use Roadmap Contextual Reasoning (RCR)</Label>
            <Switch
              id="useRCR"
              checked={settings.useRCR}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev) => ({ ...prev, useRCR: checked }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}