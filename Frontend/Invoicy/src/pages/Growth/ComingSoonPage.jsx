import React from "react";
import { Megaphone, Share2, Target, BarChart3, Plug } from "lucide-react";

const SECTION_CONFIG = {
  social: { title: "Social Media", icon: Share2, description: "Connect and manage your social channels. Coming soon." },
  analytics: { title: "Analytics", icon: BarChart3, description: "Growth and engagement analytics. Coming soon." },
  integrations: { title: "Integrations", icon: Plug, description: "Connect with your favorite tools. Coming soon." },
};

const ComingSoonPage = ({ section = "social" }) => {
  const config = SECTION_CONFIG[section] || SECTION_CONFIG.social;
  const Icon = config.icon;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-blue-900" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h1>
      <p className="text-gray-600 max-w-md">{config.description}</p>
    </div>
  );
};

export default ComingSoonPage;
