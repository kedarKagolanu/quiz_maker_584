import React, { useState } from "react";
import { Terminal, TerminalLine, TerminalButton } from "./Terminal";
import { ChevronDown, ChevronRight, BookOpen, MessageCircle, Settings, Share2, Lock, Globe, Clock, Shuffle } from "lucide-react";

export const UserGuide: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <BookOpen className="w-4 h-4" />,
      content: [
        "Welcome to your Quiz Platform! This is your personal quiz creation and sharing hub.",
        "• Create custom quizzes with multiple choice, text, and multimedia questions",
        "• Organize quizzes in folders for better management",
        "• Share quizzes with friends through chat groups or access codes",
        "• Customize quiz settings before taking them",
        "• Track your progress and compete on leaderboards"
      ]
    },
    {
      id: "creating-quizzes",
      title: "Creating & Managing Quizzes",
      icon: <BookOpen className="w-4 h-4" />,
      content: [
        "📝 Creating Quizzes:",
        "• Click 'create quiz' to start a new quiz",
        "• Add questions with multiple choice or text answers",
        "• Upload images, audio, or video for multimedia questions", 
        "• Set time limits (overall or per question)",
        "• Choose question randomization options",
        "",
        "📁 Organizing with Folders:",
        "• Create folders to group related quizzes",
        "• Set folder visibility (public/private)",
        "• Share entire folders with access codes",
        "• Nested folder structure for complex organization"
      ]
    },
    {
      id: "taking-quizzes",
      title: "Taking Quizzes",
      icon: <Clock className="w-4 h-4" />,
      content: [
        "🎯 Two Ways to Take Quizzes:",
        "• 'Customize & Take' - Modify settings for your attempt only",
        "• 'Take Now' - Use the creator's default settings",
        "",
        "⚙️ Customization Options:",
        "• Change time limits (overall and per question)",
        "• Enable/disable question randomization",
        "• Settings apply only to your current attempt",
        "• Original quiz settings remain unchanged",
        "",
        "📊 After Completion:",
        "• View your score and detailed results",
        "• Compare with others on the leaderboard",
        "• Retake quizzes with different settings"
      ]
    },
    {
      id: "sharing-access",
      title: "Sharing & Privacy",
      icon: <Share2 className="w-4 h-4" />,
      content: [
        "🌐 Public vs Private:",
        "• Public: Anyone can find and take your quizzes",
        "• Private: Only people with access codes can join",
        "",
        "🔑 Access Codes:",
        "• Generated automatically for private content",
        "• Share codes with specific people",
        "• Use 'enter access code' to join private quizzes/folders",
        "",
        "📤 Sharing Methods:",
        "• Direct links to quizzes",
        "• Access codes for private content",
        "• Chat groups for ongoing discussions",
        "• Folder sharing for multiple quizzes at once"
      ]
    },
    {
      id: "chat-system",
      title: "Chat Groups & Messaging",
      icon: <MessageCircle className="w-4 h-4" />,
      content: [
        "💬 Group Chats:",
        "• Create public groups (anyone can join)",
        "• Create private groups (need access code)",
        "• Share quizzes and folders directly in chat",
        "• Discuss quiz results and strategies",
        "",
        "👥 Direct Messages:",
        "• Start 1-on-1 conversations with other users",
        "• Share quizzes privately",
        "• Perfect for study partnerships",
        "",
        "🔄 Chat Features:",
        "• Click refresh button to get latest messages",
        "• Share quizzes with 'Take Quiz' buttons",
        "• Share folders with access codes included",
        "• Join groups by entering access codes"
      ]
    },
    {
      id: "music-library",
      title: "Music Library & Audio",
      icon: <Music className="w-4 h-4" />,
      content: [
        "🎵 Music Library Features:",
        "• Upload your own music files (MP3, WAV, OGG, M4A)",
        "• Public library - everyone can use uploaded music",
        "• Choose to show/hide your name as uploader",
        "• Advanced audio player with full controls",
        "",
        "📤 Uploading Music:",
        "• Click 'Upload Music' in the music library",
        "• Supported formats: MP3, WAV, OGG, M4A",
        "• Maximum file size: 50MB per file", 
        "• Add a descriptive title for your upload",
        "• Choose whether to show your name publicly",
        "",
        "🎧 Music Player Controls:",
        "• Play/Pause any uploaded track",
        "• Skip forward/backward 10 seconds",
        "• Seek to any position by clicking the progress bar",
        "• Volume control slider",
        "• Real-time progress tracking",
        "",
        "🎼 Using Music in Quizzes:",
        "• Background music during quiz taking",
        "• Audio questions with uploaded sounds",
        "• Timer sounds and notification effects",
        "• All users can access the shared music library",
        "",
        "📋 Upload Guidelines:",
        "• Only upload music you have rights to share",
        "• Keep titles descriptive and clean",
        "• Consider file size for better performance",
        "• Anonymous uploads are allowed for privacy"
      ]
    },
    {
      id: "themes-customization",
      title: "Themes & Interface",
      icon: <Settings className="w-4 h-4" />,
      content: [
        "🎨 Theme Options:",
        "• 7 beautiful presets: Terminal, Ocean, Forest, Sunset, Minimal, White, Reading",
        "• Dark/Light mode toggle for each theme",
        "• Gradient backgrounds (enable/disable)",
        "• Settings persist across sessions",
        "",
        "🖥️ Interface Tips:",
        "• Use Theme Hammer (top-right) for quick theme testing",
        "• All buttons have proper contrast in every theme",
        "• Responsive design works on mobile and desktop",
        "• Terminal-style interface for a unique experience"
      ]
    },
    {
      id: "advanced-features",
      title: "Advanced Features",
      icon: <Settings className="w-4 h-4" />,
      content: [
        "🔍 Quiz Browser:",
        "• Filter quizzes by type: Public, Private, Your Own, Attempted",
        "• Filter by folder to find specific topics",
        "• Advanced search and discovery options",
        "",
        "📈 Progress Tracking:",
        "• View your quiz attempt history",
        "• Track improvement over time",
        "• Compare scores with friends",
        "• Leaderboards for competitive quizzing",
        "",
        "🔄 Real-time Features:",
        "• Manual refresh for latest chat messages",
        "• Persistent chat groups and conversations",
        "• Live updates when others join your groups"
      ]
    },
    {
      id: "tips-tricks",
      title: "Tips & Best Practices",
      icon: <BookOpen className="w-4 h-4" />,
      content: [
        "✅ Creating Great Quizzes:",
        "• Use clear, concise questions",
        "• Add images/media to make quizzes engaging",
        "• Set appropriate time limits for your audience",
        "• Test your quizzes before sharing",
        "",
        "📚 Organizing Content:",
        "• Use descriptive folder names",
        "• Group related quizzes together",
        "• Keep public and private content organized",
        "",
        "👥 Social Features:",
        "• Create study groups with chat",
        "• Share quiz results for discussion",
        "• Use direct messages for private tutoring",
        "• Join others' groups to expand your learning network"
      ]
    }
  ];

  return (
    <div className="mt-8 border-t border-terminal-accent/30 pt-6">
      <Terminal title="user guide & help">
        <div className="space-y-4">
          <TerminalLine prefix="#">How to Use Your Quiz Platform</TerminalLine>
          
          {sections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            
            return (
              <div key={section.id} className="border border-terminal-accent/30 rounded">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-terminal-accent/10 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-terminal-accent" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-terminal-accent" />
                  )}
                  {section.icon}
                  <span className="text-terminal-bright font-semibold">{section.title}</span>
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-4 space-y-2">
                    {section.content.map((line, index) => (
                      <div key={index}>
                        {line === "" ? (
                          <div className="h-2" />
                        ) : line.startsWith("•") ? (
                          <TerminalLine prefix="-" className="text-terminal-foreground ml-4">
                            {line.substring(2)}
                          </TerminalLine>
                        ) : line.includes(":") && (line.startsWith("📝") || line.startsWith("📁") || line.startsWith("🎯") || line.startsWith("⚙️") || line.startsWith("📊") || line.startsWith("🌐") || line.startsWith("🔑") || line.startsWith("📤") || line.startsWith("💬") || line.startsWith("👥") || line.startsWith("🔄") || line.startsWith("🎨") || line.startsWith("🖥️") || line.startsWith("🔍") || line.startsWith("📈") || line.startsWith("✅") || line.startsWith("📚")) ? (
                          <TerminalLine prefix=">" className="text-terminal-accent font-semibold">
                            {line}
                          </TerminalLine>
                        ) : (
                          <TerminalLine prefix="" className="text-terminal-foreground ml-6">
                            {line}
                          </TerminalLine>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="mt-6 p-4 border border-terminal-accent/30 rounded bg-terminal-accent/10">
            <TerminalLine prefix="💡" className="text-terminal-bright font-semibold mb-2">
              Need Help?
            </TerminalLine>
            <TerminalLine prefix="" className="text-terminal-foreground">
              This platform is designed to be intuitive, but if you get stuck:
            </TerminalLine>
            <TerminalLine prefix="•" className="text-terminal-foreground ml-4">
              Try the different features to learn by exploration
            </TerminalLine>
            <TerminalLine prefix="•" className="text-terminal-foreground ml-4">
              Use the Theme Hammer (top-right) to test interface changes
            </TerminalLine>
            <TerminalLine prefix="•" className="text-terminal-foreground ml-4">
              Check the browser console (F12) for detailed debugging info
            </TerminalLine>
          </div>
        </div>
      </Terminal>
    </div>
  );
};